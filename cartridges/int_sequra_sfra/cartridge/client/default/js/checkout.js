/* eslint-disable global-require */
/* eslint-disable import/no-unresolved */
const processInclude = require('base/util');
const checkout = require('./checkout/checkout');
const sequraConfiguration = require('./configuration/sequraConfig');

$(document).ready(() => {
    processInclude(sequraConfiguration);
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const errorMsg = urlParams.get('paymentError');
    if (errorMsg) {
        $('.error-message').show();
        $('.error-message-text').text(errorMsg);
    }

    processInclude(checkout);
});
