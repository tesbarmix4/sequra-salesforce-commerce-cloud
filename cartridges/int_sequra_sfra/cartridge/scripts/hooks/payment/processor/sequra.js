'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');

/**
 * Verifies that payment information is a valid. If the information is valid a
 * sequra payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID

 * @return {Object} returns an error object
 */
function Handle(basket, paymentInformation, paymentMethodID) {
    var currentBasket = basket;
    var serverErrors = [];


    Transaction.wrap(function () {
        var paymentInstruments = currentBasket.getPaymentInstruments();

        collections.forEach(paymentInstruments, function (item) {
            if (item.paymentMethod !== 'GIFT_CERTIFICATE') {
                currentBasket.removePaymentInstrument(item);
            }
        });


        var paymentInstrument = currentBasket.createPaymentInstrument(
            paymentMethodID, currentBasket.totalGrossPrice
        );

        if (paymentInstrument && paymentInformation && paymentInformation.sequraPaymentMethod) {
            var sequraPaymentMethod = paymentInformation.sequraPaymentMethod;
            paymentInstrument.custom.sequraPaymentMethod = sequraPaymentMethod;
        }
    });

    return { serverErrors: serverErrors, error: false };
}

/**
 * Authorizes a payment using a Adyen.
 * @param {number} orderNumber - The current order's number
 * @param {number} orderToken - The current order's token
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @param {string} paymentMethodID - Sequra Payment Method Identification
 * @param {string} cartReference - Basket UUID
 * @param {string} sequraCampaign - Sequra Campaign connected to Sequra Payment.
 * @return {Object} returns an error object
 */

function Authorize(orderNumber, orderToken, paymentInstrument, paymentProcessor, paymentMethodID, cartReference, sequraCampaign) {
    var sequraApi = require('*/cartridge/scripts/sequra/sequraApi');
    var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
    var serverErrors = [];
    var fieldErrors = {};
    var htmlIframe = '';
    var error = false;
    var OrderMgr = require('dw/order/OrderMgr');
    var sequraTransactionID;

    var order = OrderMgr.getOrder(orderNumber, orderToken);

    var startSolicitation = sequraApi.startSolicitation(order, cartReference);

    if (startSolicitation.error) {
        error = true;
        serverErrors.push(startSolicitation.message);
    } else {
        var url = sequraHelpers.getSequraUrlLocation(startSolicitation.result);
        if (url) {
            sequraTransactionID = sequraHelpers.getSequraOrderId(url);
            var options = {
                paymentOption: paymentMethodID,
                ajax: false,
                sequraCampaign: sequraCampaign
            };
            var iframeResult = sequraApi.fetchIdentificationForm(url, options);

            if (iframeResult.error) {
                error = true;
                serverErrors.push(iframeResult.message);
            } else {
                error = false;
                htmlIframe = iframeResult.html;
                Transaction.wrap(function () {
                // eslint-disable-next-line no-param-reassign
                    paymentInstrument.custom.sequra_orderLocationURL = url;
                    order.custom.sequra_TransactionID = sequraTransactionID;
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                });
            }
        } else {
            Logger.getLogger('Sequra').error('Sequra cant create the form fetch url');
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, true);
            });
            serverErrors.push(dw.web.Resource.msg('error.technical', 'checkout', null));
            error = true;
        }
    }


    return {
        htmlIframe: htmlIframe.text, sequraTransactionID: sequraTransactionID, fieldErrors: fieldErrors, serverErrors: serverErrors, error: error
    };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
