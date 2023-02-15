'use strict';

var dwsystem = require('dw/system');
var sequraServiceObject = require('*/cartridge/scripts/service/sequraService');
var sequraApiHelper = require('*/cartridge/scripts/sequra/helpers/sequraApiHelpers');
var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');

/**
 * To start the credit solicitation and prepare the identification form, the basket information is sent to SeQura.
 * @param {dw.order.Basket} Current basket
 * @param {object} preferencesAPI - SequraPreferences
 * @return {Object} Object with boolean indicating if an error exists and the Sequra Location URL.
 */
function getSolicitationPayments(basket, preferencesAPI) {
    try {
        var preferences = preferencesAPI;
        if (!preferences.countryCode) {
            preferences = sequraHelpers.getSequraAPIPreferences({}, basket, null);
        }

        var serviceName = sequraServiceObject.SERVICE.SEQURA;
        var sequraRequest = sequraApiHelper.createSequraRequestBasket(basket, preferences);
        if (sequraRequest) {
            var service = sequraServiceObject.getService(serviceName);
            service.URL += 'orders';
            if (service) {
                service.setRequestMethod('POST');
                var result = service.call(sequraRequest);
                if (result.status === 'ERROR') {
                    return {
                        error: true,
                        message: result.errorMessage ? result.errorMessage : result.msg
                    };
                }
                return {
                    error: false,
                    result: result.object.getResponseHeaders()
                };
            }
        }
    } catch (e) {
        dwsystem.Logger.getLogger('Sequra', 'sequra').error('Sequra Error starting solicitation - {0}', e.toString());
        return {
            error: true,
            result: e.toString()
        };
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}

/**
 * To update the credit solicitation the order information is sent to SeQura.
 * @param {dw.order.Order} Current Order
 * @return {Object} Object with boolean indicating if an error exists and the Sequra Location URL.
 */
function startSolicitation(order, cartReference) {
    try {
        var sequraOrderStatus = '';
        var preferences = sequraHelpers.getSequraAPIPreferences({}, order, cartReference);
        var serviceName = sequraServiceObject.SERVICE.SEQURA;
        var sequraRequest = sequraApiHelper.createSequraRequest(order, sequraOrderStatus, preferences);
        if (sequraRequest) {
            var service = sequraServiceObject.getService(serviceName);
            service.URL += 'orders';
            if (service) {
                service.setRequestMethod('POST');
                var result = service.call(sequraRequest);
                if (result.status === 'ERROR') {
                    return {
                        error: true,
                        message: result.errorMessage ? result.errorMessage : result.msg
                    };
                }
                return {
                    error: false,
                    result: result.object.getResponseHeaders()
                };
            }
        }
    } catch (e) {
        dwsystem.Logger.getLogger('Sequra', 'sequra').error('Sequra Error starting solicitation - {0}', e.toString());
        return {
            error: true,
            result: e.toString()
        };
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}

/**
 * Method to get the identification form.
 * The identification form is a standard HTML form (in an <iframe>) that must be displayed in the shop.
 * @param {dw.order.Order} Current Order
 * @return {Object} Object with boolean indicating if an error exists and the Sequra Iframe HTML.
 */
function fetchIdentificationForm(url, options) {
    try {
        if (url) {
            var serviceName = sequraServiceObject.SERVICE.SEQURA;
            var service = sequraServiceObject.getService(serviceName);
            if (service) {
                service.setRequestMethod('GET');
                service.addHeader('Accept', 'text/html');
                var parameters = '';
                if (options) {
                    parameters = '?product=' + options.paymentOption + '&ajax=' + options.ajax;
                    if (options.sequraCampaign && options.sequraCampaign !== null && options.sequraCampaign !== 'null') {
                        parameters += '&campaign=' + options.sequraCampaign;
                    }
                }
                service.URL = url + '/form_v2' + parameters;
                var result = service.call();
                if (result.status === 'ERROR') {
                    return {
                        error: true,
                        message: result.errorMessage ? result.errorMessage : result.msg
                    };
                }
                return {
                    error: false,
                    html: result.object
                };
            }
        }
    } catch (e) {
        dwsystem.Logger.getLogger('Sequra', 'sequra').error('Sequra Error Updating Order -' + e.toString());
        return {
            error: true,
            message: e.toString()
        };
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}

/**
 * Method to finish the order.
 * @param {dw.order.Order} Current Order
 * @param {string} sequraStatus
 * @param {paymentInstrument} Sequra Payment Instrument
 * @return {Object} Object with boolean indicating if an error exists and a JSON with the order result.
 */
function finishOrder(order, sequraStatus, paymentInstrument) {
    try {
        if (order) {
            var sequraOrderLocationURL = paymentInstrument.custom.sequra_orderLocationURL;
            if (sequraOrderLocationURL) {
                var sequraOrderStatus = 'confirmed';
                if (sequraStatus === 'needs_review') {
                    sequraOrderStatus = 'on_hold';
                }
                var preferences = sequraHelpers.getSequraAPIPreferences({}, order, null);
                var sequraRequest = sequraApiHelper.createSequraRequest(order, sequraOrderStatus, preferences);
                var serviceName = sequraServiceObject.SERVICE.SEQURA;
                var service = sequraServiceObject.getService(serviceName);
                if (service) {
                    service.setRequestMethod('PUT');
                    service.URL = sequraOrderLocationURL;
                    var result = service.call(sequraRequest);
                    if (result.status === 'ERROR') {
                        return {
                            error: true,
                            message: result.errorMessage ? result.errorMessage : result.msg
                        };
                    }
                    return {
                        error: false,
                        html: result.object
                    };
                }
            }
        }
    } catch (e) {
        dwsystem.Logger.getLogger('Sequra', 'sequra').error('Sequra Error Updating Order -' + e.toString());
        return {
            error: true,
            message: e.toString()
        };
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}

/**
 * Method to update the order.
 * @param {dw.order.Order} Current Order
 * @param {Object} data with Cancellation Info.
 * @return {Object} Object with boolean indicating if an error exists and a JSON with the order result.
 */
function updateOrder(order) {
    try {
        if (order) {
            var preferences = sequraHelpers.getSequraAPIPreferences({}, order, null);
            var sequraRequest = sequraApiHelper.createSequraUpdateRequest(order, preferences);
            var serviceName = sequraServiceObject.SERVICE.SEQURA;
            var service = sequraServiceObject.getService(serviceName);
            if (service) {
                service.setRequestMethod('PUT');
                service.URL += 'merchants/' + preferences.sequra_merchantID + '/orders/' + order.getOrderNo();
                var result = service.call(sequraRequest);
                if (result.status === 'ERROR') {
                    return {
                        error: true,
                        message: result.errorMessage ? result.errorMessage : result.msg
                    };
                }
                return {
                    error: false,
                    html: result.object
                };
            }
        }
    } catch (e) {
        dwsystem.Logger.getLogger('Sequra', 'sequra').error('Sequra Error Updating Order -' + e.toString());
        return {
            error: true,
            message: e.toString()
        };
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}


/**
 * Method to Cancel the order.
 * @param {dw.order.Order} Current Order
 * @return {Object} Object with boolean indicating if an error exists and a JSON with the order result.
 */
function cancelOrder(order, data) {
    try {
        var preferences = sequraHelpers.getSequraAPIPreferences({}, order, null);
        if (order && preferences.countryCode) {
            var sequraRequest = sequraApiHelper.createSequraCancelRequest(order, data, preferences);
            var serviceName = sequraServiceObject.SERVICE.SEQURA;
            var service = sequraServiceObject.getService(serviceName);
            if (service) {
                service.setRequestMethod('PUT');
                service.URL += 'merchants/' + preferences.sequra_merchantID + '/orders/' + order.getOrderNo();
                var result = service.call(sequraRequest);
                if (result.status === 'ERROR') {
                    return {
                        error: true,
                        message: result.errorMessage ? result.errorMessage : result.msg
                    };
                }
                return {
                    error: false,
                    html: result.object
                };
            }
        }
    } catch (e) {
        dwsystem.Logger.getLogger('Sequra', 'sequra').error('Sequra Error Cancelling Order -' + e.toString());
        return {
            error: true,
            message: e.toString()
        };
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}


/**
 * Method to get the sequra payments methods allowed once the current basket has been sent to Sequra.
 * @param {string} Sequra Location url.
 * @param {object} Preferences - Sequra Preferences
 * @return {Object} Object with boolean indicating if an error exists and JSON with Sequra Payment Methods.
 */
function getSequraPaymentMethods(url, preferences) {
    if (url && preferences.countryCode) {
        var serviceName = sequraServiceObject.SERVICE.SEQURA;
        var service = sequraServiceObject.getService(serviceName);
        if (service) {
            service.setRequestMethod('GET');
            service.URL = url + '/payment_methods';
            var result = service.call();
            if (result.status === 'ERROR') {
                return {
                    error: true,
                    message: result.errorMessage ? result.errorMessage : result.msg
                };
            }
            return {
                error: false,
                html: result.object.text
            };
        }
    }
    return {
        error: true,
        message: dw.web.Resource.msg('error.technical', 'checkout', null)
    };
}

module.exports = {
    startSolicitation: startSolicitation,
    getSolicitationPayments: getSolicitationPayments,
    fetchIdentificationForm: fetchIdentificationForm,
    finishOrder: finishOrder,
    updateOrder: updateOrder,
    cancelOrder: cancelOrder,
    getSequraPaymentMethods: getSequraPaymentMethods
};
