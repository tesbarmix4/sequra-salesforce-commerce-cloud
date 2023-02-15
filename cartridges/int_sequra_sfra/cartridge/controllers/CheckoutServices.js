/**
 * @namespace CheckoutServices
 */

'use strict';

var page = module.superModule;
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

server.extend(page);

/**
 *  CheckoutServices-SubmitPayment : The CheckoutServices-SubmitPayment prepend check if the sequra payment type is selected.
 * @param {httpparameter} - dwfrm_billing_paymentMethod - Input field for the shopper's payment method
 * @param {httpparameter} - dwfrm_billing_sequra_sequraPaymentMethod - Sequra payment type.
 * @returns json
 */
server.prepend(
    'SubmitPayment',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var paymentForm = server.forms.getForm('billing');
        var paymentMethodID = paymentForm.paymentMethod.value;
        if (paymentMethodID === 'SEQURA') {
            var sequraPaymentMethod = paymentForm.sequra.sequraPaymentMethod.value;
            if (!sequraPaymentMethod) {
                res.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [dw.web.Resource.msg('error.technical', 'checkout', null)],
                    redirectUrl: dw.web.URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
                });
                this.emit('route:Complete', req, res);
            }
        }

        next();
    }
);

/**
 *  CheckoutServices-SubmitPayment : The CheckoutServices-SubmitPayment append method save the sequra payment method selected
 * in the viewData.
 * @param {httpparameter} - dwfrm_billing_paymentMethod - Input field for the shopper's payment method
 * @param {httpparameter} - dwfrm_billing_sequra_sequraPaymentMethod - Sequra payment type.
 * @returns json
 */
server.append(
    'SubmitPayment',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var paymentForm = server.forms.getForm('billing');
        var paymentMethodID = paymentForm.paymentMethod.value;
        var viewData = res.getViewData();
        if (paymentMethodID === 'SEQURA') {
            var sequraPaymentMethod = paymentForm.sequra.sequraPaymentMethod.value;
            if (viewData.paymentInformation) {
                viewData.paymentInformation.sequraPaymentMethod = sequraPaymentMethod;
            } else {
                viewData.paymentInformation = {
                    sequraPaymentMethod: sequraPaymentMethod
                };
            }
        }

        next();
    }
);
/**
 * CheckoutServices-PlaceOrder : The CheckoutServices-PlaceOrder endpoint places the order
 * @name Base/CheckoutServices-PlaceOrder
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.prepend('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var SequraCheckoutHelpers = require('*/cartridge/scripts/checkout/sequraCheckoutHelpers');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
    var isSequra = false;
    var paymentForm = server.forms.getForm('billing');
    var paymentMethodID = paymentForm.paymentMethod.value;

    if (!paymentMethodID) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
        });
        this.emit('route:Complete', req, res);
        return;
    }
    var sequraCampaign;
    if (paymentMethodID === 'SEQURA') {
        var paymentSequraID = paymentForm.sequra.sequraPaymentMethod.value;
        sequraCampaign = paymentForm.sequra.sequraCampaign.value;
        if (!paymentSequraID) {
            res.json({
                error: true,
                cartError: true,
                fieldErrors: [],
                serverErrors: [],
                redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'payment').toString()
            });
            this.emit('route:Complete', req, res);
            return;
        }
        paymentMethodID = paymentSequraID;

        isSequra = true;
    }

    if (!isSequra) {
        next();
        return;
    }

    var data = res.getViewData();
    if (data && data.csrfError) {
        res.json();
        this.emit('route:Complete', req, res);
        return;
    }

    var currentBasket = BasketMgr.getCurrentBasket();
    var uuid = currentBasket.getUUID();

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        this.emit('route:Complete', req, res);
        return;
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        this.emit('route:Complete', req, res);
        return;
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });
        this.emit('route:Complete', req, res);
        return;
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        this.emit('route:Complete', req, res);
        return;
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        this.emit('route:Complete', req, res);
        return;
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    var validPayment = SequraCheckoutHelpers.validateSequraPayment(req, currentBasket);
    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        this.emit('route:Complete', req, res);
        return;
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        this.emit('route:Complete', req, res);
        return;
    }

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        this.emit('route:Complete', req, res);
        return;
    }

    // Handles payment authorization
    var handlePaymentResult = SequraCheckoutHelpers.sequraHandlePayments(order, order.orderNo, paymentMethodID, uuid, sequraCampaign);

    // Handle custom processing post authorization
    var options = {
        req: req,
        res: res
    };
    var postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', handlePaymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        res.json(postAuthCustomizations);
        next();
    }

    if (handlePaymentResult.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: handlePaymentResult.fieldErrors,
            serverErrors: handlePaymentResult.serverErrors,
            redirectUrl: dw.web.URLUtils.url('Checkout-Begin', 'stage', 'placeOrder', 'paymentError', dw.web.Resource.msg('error.technical', 'checkout', null)).toString()
        });
        this.emit('route:Complete', req, res);
        return;
    } if (handlePaymentResult.htmlIframe) {
        var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
        var securaContext = {
            htmlFrame: handlePaymentResult.htmlIframe
        };
        var sequraFormRenderedTemplate = renderTemplateHelper.getRenderedHtml(securaContext, 'checkout/sequraidentificationform');
        res.json({
            error: false,
            IframeHtml: sequraFormRenderedTemplate,
            orderID: order.orderNo,
            orderToken: order.orderToken,
            sequraTransactionID: handlePaymentResult.sequraTransactionID
        });
        this.emit('route:Complete', req, res);
        return;
    }
    next();
});

module.exports = server.exports();
