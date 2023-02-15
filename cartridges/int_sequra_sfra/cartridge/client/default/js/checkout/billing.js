/* eslint-disable global-require */
/* eslint-disable import/no-unresolved */
const base = require('base/checkout/billing');
const sequraCheckout = require('./sequraCheckout');

const paymentsMethods = {
    creditCard: 'CREDIT_CARD',
    sequra: 'SEQURA',
    i1: 'i1',
    pp3: 'pp3',
    sp1: 'sp1',
    pp5: 'pp5',
};


/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
const updatePaymentInformation = (order) => {
    // update payment details
    const $paymentSummary = $('.payment-details');
    const { selectedPaymentInstruments } = order.billing.payment;

    let htmlToAppend = '';

    if (order.billing.payment && selectedPaymentInstruments
        && selectedPaymentInstruments.length > 0) {
        if (selectedPaymentInstruments[0].paymentMethod === paymentsMethods.creditCard) {
            htmlToAppend += `<span>${order.resources.cardType} ${
                order.billing.payment.selectedPaymentInstruments[0].type
            }</span><div>${
                order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
            }</div><div><span>${
                order.resources.cardEnding} ${
                order.billing.payment.selectedPaymentInstruments[0].expirationMonth
            }/${order.billing.payment.selectedPaymentInstruments[0].expirationYear
            }</span></div>`;
        } else if (selectedPaymentInstruments[0].paymentMethod === paymentsMethods.sequra) {
            const { sequraPaymentMethod } = selectedPaymentInstruments[0];
            if (sequraPaymentMethod === paymentsMethods.i1) {
                htmlToAppend += `<span>${order.sequraResources.i1}</span>`;
            } else if (sequraPaymentMethod === paymentsMethods.pp3) {
                htmlToAppend += `<span>${order.sequraResources.pp3}</span>`;
            } else if (sequraPaymentMethod === paymentsMethods.sp1) {
                htmlToAppend += `<span>${order.sequraResources.sp1}</span>`;
            } else if (sequraPaymentMethod === paymentsMethods.pp5) {
                htmlToAppend += `<span>${order.sequraResources.pp5}</span>`;
            }
        }
    }
    $paymentSummary.empty().append(htmlToAppend);
};


base.methods.updatePaymentInformation = updatePaymentInformation;

module.exports = {
    ...base,

    manageSequraPaymentMethodsView: sequraCheckout.manageSequraPaymentMethodsView(),

};
