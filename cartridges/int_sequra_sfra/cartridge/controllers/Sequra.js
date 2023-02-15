/* eslint-disable no-restricted-syntax */
/* eslint-disable array-callback-return */

'use strict';

/**
 * @namespace Sequra
 */

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
var sequraApi = require('*/cartridge/scripts/sequra/sequraApi');
var cache = require('*/cartridge/scripts/middleware/cache');


/**
 * Sequra-IPN : The Sequra-IPN endpoint is where Sequra sends the IPN (Instant Payment Notification), it's guarantee the payment of the order for which the credit was solicited and that it is now OK to go ahead and place the order
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken.
 * @param {httpparameter} - order_ref_1 - Order reference.
 * @param {httpparameter} - orderToken - Order Token.
 * @param {httpparameter} - sq_state - Sequra payment status.
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post(
    'IPN',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res) {
        var Transaction = require('dw/system/Transaction');
        var OrderMgr = require('dw/order/OrderMgr');
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var parameters = req.httpParameterMap;
        var orderNo = parameters.get('order_ref_1').value;
        var orderToken = parameters.get('orderToken').value;
        var sequraOrderStatus = parameters.get('sq_state').value;
        var error = dw.web.Resource.msg('error.technical', 'checkout', null);
        var signature = parameters.get('signature').value;
        if (orderNo && orderToken) {
            var order = OrderMgr.getOrder(orderNo, orderToken);
            if (order) {
                var signatureOrder = sequraHelpers.getSequraHash(order.getOrderNo());
                var sequraProductsInfo = sequraHelpers.getOrderProductInfo(order);
                var itemsShippingStatus = JSON.stringify(Object.assign({}, sequraProductsInfo));
                if (signature === signatureOrder) {
                    var paymentInstrument = sequraHelpers.getSequraPaymentInstrument(order);
                    var result = sequraApi.finishOrder(order, sequraOrderStatus, paymentInstrument);
                    if (!result.error) {
                        var orderInformation;
                        if (sequraOrderStatus === 'approved') {
                            var fraudDetectionStatus = { status: 'success' };

                            // Places the order
                            var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
                            if (placeOrderResult.error) {
                                res.setStatusCode(410);
                                res.render('/checkout/notifyError', {
                                    errorMessage: error
                                });
                                this.emit('route:Complete', req, res);
                                return;
                            }

                            orderInformation = JSON.stringify({
                                sequraStatus: sequraOrderStatus,
                                salesforceOrderStatus: dw.order.Order.ORDER_STATUS_NEW,
                                paymentStatus: dw.order.Order.PAYMENT_STATUS_PAID,
                                shippingStatus: dw.order.Order.SHIPPING_STATUS_NOTSHIPPED,
                                items: itemsShippingStatus
                            });

                            Transaction.wrap(function () {
                                order.setPaymentStatus(dw.order.Order.PAYMENT_STATUS_PAID);
                                order.setExportStatus(dw.order.Order.EXPORT_STATUS_READY);
                                order.custom.sequra_orderInformation = orderInformation;
                                paymentInstrument.custom.sequra_orderStatus = sequraOrderStatus;
                            });
                            COHelpers.sendConfirmationEmail(order, req.locale.id);
                        } else {
                            orderInformation = JSON.stringify({
                                sequraStatus: sequraOrderStatus,
                                salesforceOrderStatus: dw.order.Order.ORDER_STATUS_CREATED,
                                paymentStatus: dw.order.Order.PAYMENT_STATUS_NOTPAID,
                                shippingStatus: dw.order.Order.SHIPPING_STATUS_NOTSHIPPED,
                                items: itemsShippingStatus
                            });

                            Transaction.wrap(function () {
                                paymentInstrument.custom.sequra_orderStatus = sequraOrderStatus;
                            });
                        }


                        res.render('/checkout/notify', {
                            errorMessage: ''
                        });
                        this.emit('route:Complete', req, res);
                        return;
                    }
                    error = result.msg;
                }
            }
        }

        res.setStatusCode(410);
        res.render('/checkout/notifyError', {
            errorMessage: error
        });
        this.emit('route:Complete', req, res);
    }
);


/**
 * Sequra-AbortOrder : The Sequra-AbortOrder endpoint is used to abort the sequra order.
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken.
 * @param {httpparameter} - orderID - Order reference.
 * @param {httpparameter} - orderToken - Order Token.
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post(
    'AbortOrder',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');
        var OrderMgr = require('dw/order/OrderMgr');
        var parameters = req.httpParameterMap;
        var orderID = parameters.get('orderID').value;
        var orderToken = parameters.get('orderToken').value;

        var sequraOrderReference = parameters.get('sequraOrderReference');
        var sequraOrderSignature = parameters.get('sequraOrderSignature');
        var order;
        if (orderID && orderToken) {
            order = dw.order.OrderMgr.getOrder(orderID, orderToken);
        } else if (sequraOrderReference && sequraOrderSignature) {
            var sequraOrdersResult = dw.order.OrderMgr.searchOrders('custom.sequraOrderReference = {0} AND custom.sequraOrderSignature = {1} AND status != {2} AND status != {3}', 'creationDate desc', sequraOrderReference, sequraOrderSignature, dw.order.Order.ORDER_STATUS_FAILED, dw.order.Order.ORDER_STATUS_COMPLETED);
            if (sequraOrdersResult && sequraOrdersResult.count === 1) {
                order = sequraOrdersResult.first();
            }
        }

        if (order) {
            var paymentInstrument = sequraHelpers.getSequraPaymentInstrument(order);
            if (paymentInstrument && paymentInstrument.custom.sequra_orderStatus !== 'approved') {
                Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                res.json({
                    urlRedirect: dw.web.URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
                });
            }
        }

        next();
    }
);

/**
 * Sequra-ShowConfirmation : The Sequra-ShowConfirmation endpoint is used to show confirmation page.
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken.
 * @param {httpparameter} - orderID - Order reference.
 * @param {httpparameter} - orderToken - Order Token.
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get(
    'ShowConfirmation',
    server.middleware.https,
    function (req, res, next) {
        var orderToken = req.querystring.orderToken;
        var orderID = req.querystring.orderID;
        // eslint-disable-next-line no-unused-vars
        var order = dw.order.OrderMgr.getOrder(orderID, orderToken);
        var sequraURL;
        if (order && order.customer.ID === req.currentCustomer.raw.ID) {
            var paymentInstrument = sequraHelpers.getSequraPaymentInstrument(order);
            if (paymentInstrument && paymentInstrument.custom.sequra_orderStatus === 'approved') {
                // Reset usingMultiShip after successful Order placement
                req.session.privacyCache.set('usingMultiShipping', false);
            }
            sequraURL = dw.web.URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString();
        } else {
            sequraURL = dw.web.URLUtils.url('Checkout-Begin', 'stage', 'placeOrder', 'paymentError', dw.web.Resource.msg('error.technical', 'checkout', null));
        }

        res.render('/checkout/sequraform', {
            sequraURL: sequraURL,
            orderID: orderID,
            orderToken: orderToken
        });

        return next();
    }
);

/**
 * Sequra-Events : The Sequra-Events endpoint is used to process the orders changes sent by Sequra BackEnd.
 * @param {middleware} - server.middleware.https
 * @param {httpparameter} - m_orderID - Order reference.
 * @param {httpparameter} - m_orderToken - Order Token.
 * @param {httpparameter} - m_signature - Order Signature.
 * @param {httpparameter} - event - Sequran Event.
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post(
    'Events',
    server.middleware.https,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');
        var parameters = req.httpParameterMap;
        var orderNo = parameters.get('m_orderID').value;
        var orderToken = parameters.get('m_orderToken').value;
        var signature = parameters.get('m_signature').value;
        var eventResult = {};
        if (orderNo && orderToken) {
            var order = dw.order.OrderMgr.getOrder(orderNo, orderToken);
            if (order) {
                var signatureOrder = sequraHelpers.getSequraHash(order.getOrderNo());
                if (signature === signatureOrder) {
                    var sequraOrderStatus = parameters.get('event').value;
                    var sequraProductsInfo = sequraHelpers.getOrderProductInfo(order);
                    var itemsShippingStatus = JSON.stringify(Object.assign({}, sequraProductsInfo));
                    var orderInformation = JSON.stringify({
                        sequraStatus: 'cancelled',
                        salesforceOrderStatus: dw.order.Order.ORDER_STATUS_CANCELLED,
                        paymentStatus: order.paymentStatus.value,
                        shippingStatus: order.shippingStatus.value,
                        items: itemsShippingStatus
                    });
                    if (sequraOrderStatus === 'cancelled') {
                        Transaction.wrap(function () {
                            order.custom.sequra_orderInformation = orderInformation;
                            dw.order.OrderMgr.failOrder(order, true);
                        });
                    } else if (sequraOrderStatus === 'cancel') {
                        var data = {
                            cancellationReason: 'unspecified'
                        };
                        Transaction.wrap(function () {
                            dw.order.OrderMgr.cancelOrder(order);
                            order.custom.sequra_orderInformation = orderInformation;
                        });
                        eventResult = sequraApi.cancelOrder(order, data);
                    }
                }
            }
        }
        res.json(eventResult);
        return next();
    }
);

/**
 * Sequra-Widget : The Sequra-Widget endpoint is used render the widget html.
 * @param {middleware} - server.middleware.https
 * @param {returns} - json
 * @param {serverfunction} - get
 */
server.get(
    'Widget',
    server.middleware.https,
    function (req, res, next) {
        var preferences = sequraHelpers.getSequraPreferences();
        var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
        var loadSequraWidget = preferences.sequra_widgetsProducts !== null;
        var sequraProducts = {};
        var sequraWidgetsAppearence = [];
        if (loadSequraWidget) {
            sequraProducts = preferences.sequra_widgetsProducts;
        }

        if (preferences.sequra_widgetsAppearence) {
            var sequraWidgetPreferences = preferences.sequra_widgetsAppearence;
            var preferenceItem = {};

            // eslint-disable-next-line guard-for-in
            for (var key in sequraWidgetPreferences) {
                var value = sequraWidgetPreferences[key];
                preferenceItem = {
                    key: key,
                    value: value
                };
                sequraWidgetsAppearence.push(preferenceItem);
            }
        }
        var price = req.querystring.amount;
        var quantity = req.querystring.quantity;
        var widgetContext = {
            loadSequraWidget: loadSequraWidget,
            sequraProducts: sequraProducts,
            amount: (parseFloat(price) * quantity * 100).toFixed(0),
            sequraWidgetsAppearence: sequraWidgetsAppearence,
            isSilent: preferences.isSilent,
            locale: preferences.sequra_locale
        };
        var sequraWidgetTemplate = renderTemplateHelper.getRenderedHtml(widgetContext, '/product/components/sequraWidget');
        res.json({
            sequraWidgetTemplate: sequraWidgetTemplate
        });

        next();
    }
);


/**
 * Sequra-Payments : The Sequra-Widget endpoint is used to get the sequra payments in the checkout.
 * @param {middleware} - server.middleware.https
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post(
    'Payments',
    server.middleware.https,
    function (req, res, next) {
        var URLUtils = require('dw/web/URLUtils');
        var BasketMgr = require('dw/order/BasketMgr');
        var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
        var currentBasket = BasketMgr.getCurrentBasket();
        var serverErrors = [];
        var error = false;
        var paymentForm = server.forms.getForm('billing');
        var sequraWidgetAmount = req.form.ordervalue;
        var template = req.form.template && req.form.template === 'separated' ? '/checkout/billing/paymentOptions/sequra/sequraPaymentsOptionsSeparated' : '/checkout/billing/paymentOptions/sequra/sequraPaymentsOptions';
        var sequraPaymentOptionsTemplate;

        if (!currentBasket) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }
        var preferences = sequraHelpers.getSequraPreferences();
        var startSolicitation = sequraApi.getSolicitationPayments(currentBasket, preferences);

        if (startSolicitation.error) {
            error = true;
            serverErrors.push(dw.web.Resource.msg('error.technical', 'checkout', null));
        } else {
            var url = sequraHelpers.getSequraUrlLocation(startSolicitation.result);
            if (url) {
                var paymentMethodsSequra = sequraApi.getSequraPaymentMethods(url, preferences);
                if (paymentMethodsSequra && !paymentMethodsSequra.error) {
                    var paymentsJSON = JSON.parse(paymentMethodsSequra.html);
                    var paymentOptions = paymentsJSON.payment_options;
                    var sequraPaymentOptions = [];
                    var sequraPaymentsAvailables = preferences.sequraPaymentsAvailables;
                    paymentOptions.forEach(function (paymentOption) {
                        var paymentMethods = paymentOption.methods;
                        paymentMethods.forEach(function (paymentMethod) {
                            if (sequraPaymentsAvailables.toString().indexOf(paymentMethod.product.toString()) !== -1) {
                                var paymentMethodSequra = {
                                    product: paymentMethod.product,
                                    campaign: paymentMethod.campaign,
                                    title: paymentMethod.title,
                                    long_title: paymentMethod.long_title,
                                    claim: paymentMethod.claim,
                                    description: paymentMethod.description,
                                    icon: paymentMethod.icon,
                                    cost: paymentMethod.cost,
                                    cost_description: paymentMethod.cost_description
                                };
                                sequraPaymentOptions.push(paymentMethodSequra);
                            }
                        });
                    });

                    var sequraPaymentContext = {
                        sequraPaymentOptions: sequraPaymentOptions,
                        sequraForm: paymentForm,
                        sequraWidgetAmount: (parseFloat(sequraWidgetAmount) * 100).toFixed(0)
                    };

                    sequraPaymentOptionsTemplate = renderTemplateHelper.getRenderedHtml(sequraPaymentContext, template);
                } else {
                    error = true;
                    serverErrors.push(dw.web.Resource.msg('error.technical.sequra', 'sequra', null));
                }
            } else {
                error = true;
                serverErrors.push(dw.web.Resource.msg('error.technical.sequra', 'sequra', null));
            }
        }

        res.json({
            error: error,
            serverErrors: serverErrors,
            serverErrorMessage: dw.web.Resource.msg('error.technical.sequra', 'sequra', null),
            sequraPaymentOptionsTemplate: sequraPaymentOptionsTemplate
        });

        return next();
    }
);

/**
 * Sequra-Config : Import the Sequra JS library.
 * @param {middleware} - cache.applyDefaultCache
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('Config', cache.applyDefaultCache, function (req, res, next) {
    try {
        var renderTemplate = 'common/sequraConfig';
        res.render(renderTemplate, {});
    } catch (e) {
        dw.system.Logger.getLogger('Sequra', 'sequra').error('Sequra Error getting Config - {0}', e.toString());
    }
    next();
});

/**
 * Sequra-AbortSequraOrderByReference : The Sequra-AbortSequraOrderByReference endpoint is used to abort the sequra order using the sequra order
 * id reference.
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken.
 * @param {httpparameter} - sequraOrderID - Sequra Order reference.
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.post('AbortSequraOrderByReference', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var parameters = req.httpParameterMap;
    var sequraOrderID = parameters.get('sequraOrderID').value;
    var order;
    if (sequraOrderID) {
        var orders = dw.order.OrderMgr.searchOrders('custom.sequra_TransactionID = {0}', 'creationDate desc', sequraOrderID);
        if (orders.count > 0) {
            order = orders.first();
        }
    }

    if (order) {
        var paymentInstrument = sequraHelpers.getSequraPaymentInstrument(order);
        if (paymentInstrument && paymentInstrument.custom.sequra_orderStatus !== 'approved') {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            res.json({
                urlRedirect: dw.web.URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
            });
        }
    }

    next();
});

module.exports = server.exports();
