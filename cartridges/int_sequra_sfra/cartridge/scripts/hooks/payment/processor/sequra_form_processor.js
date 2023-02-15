'use strict';

/**
 * Verifies that payment information is a valid. If the information is valid a
 * sequra payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @param {Object} req the request object
 * @return {Object} returns an error object
 */
function processForm(req, paymentForm, viewFormData) {
    var viewData = viewFormData;

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    return {
        error: false,
        viewData: viewData
    };
}

/**
 * No Payment Information is Saved.
 */
function savePaymentInformation() {

}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
