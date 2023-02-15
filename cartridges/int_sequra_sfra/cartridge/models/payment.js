'use strict';

var collections = require('*/cartridge/scripts/util/collections');

var base = module.superModule;
/**
 * Creates an array of objects containing selected payment information
 * @param {dw.util.ArrayList<dw.order.PaymentInstrument>} selectedPaymentInstruments - ArrayList
 *      of payment instruments that the user is using to pay for the current basket
 * @returns {Array} Array of objects that contain information about the selected payment instruments
 */

function getSelectedPaymentInstruments(selectedPaymentInstruments) {
    return collections.map(selectedPaymentInstruments, function (paymentInstrument) {
        var results = { isSequra: false };
        if (paymentInstrument.paymentMethod === 'SEQURA') {
            if (paymentInstrument.custom.sequraPaymentMethod) {
                results.isSequra = true;
                results.paymentMethod = paymentInstrument.paymentMethod;
                results.amount = paymentInstrument.paymentTransaction.amount.value;
                results.sequraPaymentMethod = paymentInstrument.custom.sequraPaymentMethod;
                results.sequraPaymentStatus = paymentInstrument.custom.sequra_orderStatus;
            }
        }
        return results;
    });
}
/**
 * Payment class that represents payment information for the current basket
 * @param {dw.order.Basket} currentBasket - the target Basket object
 * @param {dw.customer.Customer} currentCustomer - the associated Customer object
 * @param {string} countryCode - the associated Site countryCode
 * @constructor
 */


function Payment(currentBasket, currentCustomer, countryCode) {
    base.call(this, currentBasket, currentCustomer, countryCode);
    var paymentInstruments = currentBasket.paymentInstruments;
    var selectedPaymentInstrumentsSequra = paymentInstruments ? getSelectedPaymentInstruments(paymentInstruments) : null;
    this.selectedPaymentInstruments = selectedPaymentInstrumentsSequra && selectedPaymentInstrumentsSequra.length > 0 && selectedPaymentInstrumentsSequra[0].isSequra ? selectedPaymentInstrumentsSequra : this.selectedPaymentInstruments;
}

module.exports = Payment;
