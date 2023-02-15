'use strict';

var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @param {string} cartReference - Cart UUID
 * @param {string} sequraCampaign - sequraCampaign got from Sequra Payment Method.
 * @returns {Object} an error object
 */
function sequraHandlePayments(order, orderNumber, paymentMethodID, cartReference, sequraCampaign) {
    var result = {};

    if (order.totalNetPrice !== 0.00) {
        var paymentInstruments = order.paymentInstruments;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i += 1) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;
                var authorizationResult;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if (HookMgr.hasHook('app.payment.processor.'
                            + paymentProcessor.ID.toLowerCase())) {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                            'Authorize',
                            orderNumber,
                            order.getOrderToken(),
                            paymentInstrument,
                            paymentProcessor,
                            paymentMethodID,
                            cartReference,
                            sequraCampaign
                        );
                    } else {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.default',
                            'Authorize'
                        );
                    }

                    if (authorizationResult.error) {
                        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                        result.error = true;
                        result.fieldErrors = authorizationResult.fieldErrors;
                        result.serverErrors = authorizationResult.serverErrors;
                        break;
                    } else {
                        result.error = false;
                        result.sequraTransactionID = authorizationResult.sequraTransactionID;
                        result.htmlIframe = authorizationResult.htmlIframe;
                    }
                }
            }
        }
    }

    return result;
}

/**
 * Validates payment
 * @param {Object} req - The local instance of the request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an object that has error information
 */
function validateSequraPayment(req, currentBasket) {
    var sequraApiHelper = require('*/cartridge/scripts/sequra/helpers/sequraApiHelpers');
    var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
    var basketInfo = sequraApiHelper.createJSONPayload(currentBasket);
    var result = {};
    if (!basketInfo) {
        result.error = true;
    } else {
        var validCart = sequraHelpers.validateCart(basketInfo.cart);
        var validShippingMethod = sequraHelpers.validateShippingMethod(basketInfo.delivery_method);
        var validateShippingAddress = sequraHelpers.validateAddress(basketInfo.delivery_address);
        var validateBillingAddress = sequraHelpers.validateAddress(basketInfo.invoice_address);
        var validateCustomer = sequraHelpers.validateCustomer(basketInfo.customer);
        var validatePlatform = sequraHelpers.validatePlatform(basketInfo.platform);
        if (validCart && validShippingMethod && validateShippingAddress && validateBillingAddress
            && validateCustomer && validatePlatform) {
            result.error = false;
        } else {
            result.error = true;
        }
    }
    return result;
}

module.exports = {
    sequraHandlePayments: sequraHandlePayments,
    validateSequraPayment: validateSequraPayment
};
