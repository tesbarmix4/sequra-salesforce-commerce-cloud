/* eslint-disable radix */

'use strict';

/**
 * Get the location url got from the StartSolicitation
 * @param {Object} StartSolicitation result
 * @returns {string} Sequra Location URL
 */
function getSequraUrlLocation(data) {
    var url;
    if (data) {
        var locationEntry = data.get('Location') || data.get('location');
        url = locationEntry[0];
    }
    return url;
}

/**
 * Get the Sequra Order Identification.
 * @param {String} Sequra Location URL
 * @returns {string} Sequra Order Identification.
 */
function getSequraOrderId(url) {
    return url.substring(url.lastIndexOf('/') + 1);
}

/**
 * Get hash value code.
 * @param {string} number
 * @returns {string} Returns hash value code
 */
function getSequraHash(number) {
    var value = number + dw.system.Site.current.getCustomPreferenceValue('sequra_assetKey') + dw.system.Site.current.ID;
    var Bytes = require('dw/util/Bytes');
    var MessageDigest = require('dw/crypto/MessageDigest');
    var Encoding = require('dw/crypto/Encoding');
    var digestSHA512 = new MessageDigest(MessageDigest.DIGEST_SHA_512);
    var signature = Encoding.toHex(digestSHA512.digestBytes(new Bytes(value)));
    return signature;
}

/**
 * Get Sequra Configuration Parameters.
 * @returns {Array}  Array of Sequra Preferences.
 */
function getSequraPreferences() {
    var Locale = require('dw/util/Locale');
    var site = require('dw/system/Site').current;
    var prefsCache = require('dw/system/CacheMgr').getCache('sequraPreferences');
    var preferences = {};
    var merchanIDPattern = '-' + site.current.ID;

    var sequraMerchantIDES = prefsCache.get('sequra_merchantID_ES' + merchanIDPattern);
    var sequraMerchantIDPT = prefsCache.get('sequra_merchantID_PT' + merchanIDPattern);
    var sequraMerchantIDIT = prefsCache.get('sequra_merchantID_IT' + merchanIDPattern);
    var sequraAssetKey = prefsCache.get('sequra_assetKey' + merchanIDPattern);
    var sequraConfiguration = prefsCache.get('sequra_Configuration' + merchanIDPattern);

    if (!sequraMerchantIDES) {
        sequraMerchantIDES = site.getCustomPreferenceValue('sequra_merchantID_ES');
        prefsCache.put('sequra_merchantID_ES' + merchanIDPattern, sequraMerchantIDES);
    }

    if (!sequraMerchantIDPT) {
        sequraMerchantIDPT = site.getCustomPreferenceValue('sequra_merchantID_PT');
        prefsCache.put('sequra_merchantID_PT' + merchanIDPattern, sequraMerchantIDPT);
    }

    if (!sequraMerchantIDIT) {
        sequraMerchantIDIT = site.getCustomPreferenceValue('sequra_merchantID_IT');
        prefsCache.put('sequra_merchantID_IT' + merchanIDPattern, sequraMerchantIDIT);
    }

    if (!sequraConfiguration) {
        sequraConfiguration = site.getCustomPreferenceValue('sequra_Configuration');
        prefsCache.put('sequra_Configuration' + merchanIDPattern, sequraConfiguration);
    }

    if (!sequraAssetKey) {
        sequraAssetKey = site.getCustomPreferenceValue('sequra_assetKey');
        prefsCache.put('sequra_assetKey' + merchanIDPattern, sequraAssetKey);
    }

    if (sequraConfiguration) {
        var locale = request.getLocale();
        var currentLocale = Locale.getLocale(locale);
        var countryCode = currentLocale && currentLocale.country ? currentLocale.country : request.geolocation.countryCode;
        if (locale && locale.indexOf('_') !== -1) {
            locale = locale.replace('_', '-');
        }

        if (countryCode) {
            preferences.countryCode = countryCode;
            var JSONConfiguration = JSON.parse(sequraConfiguration);
            var countryConfiguration = JSONConfiguration[countryCode.toString().toUpperCase()];
            if (countryConfiguration) {
                var sequraWidgetsProductDetail = countryConfiguration.sequra_widgetsProducts;
                var sequraWidgetsAppearence = countryConfiguration.sequra_widgetsAppearence;
                var sequraWidgetEnabled = countryConfiguration.sequra_widgetEnabled;
                var sequraPaymentAvailablesCheckout = countryConfiguration.sequra_paymentAvailablesCheckout;
                var sequraProducts = '';
                var sequraPaymentsAvailables = '';
                var sequraWidgetURL = dw.web.URLUtils.url('Sequra-Widget', 'locale', currentLocale.ID).toString();
                if (sequraWidgetsProductDetail) {
                // eslint-disable-next-line array-callback-return
                    sequraWidgetsProductDetail.forEach(function (item, index) {
                        if (index !== 0) {
                            sequraProducts += ',';
                        }
                        sequraProducts += item;
                    });
                }
                if (sequraPaymentAvailablesCheckout) {
                    // eslint-disable-next-line array-callback-return
                    sequraPaymentAvailablesCheckout.forEach(function (item, index) {
                        if (index !== 0) {
                            sequraPaymentsAvailables += ',';
                        }
                        sequraPaymentsAvailables += item;
                    });
                }
                preferences.isSilent = !(countryCode && countryCode !== 'ES');
                preferences.sequra_locale = locale;
                preferences.sequra_widgetsProducts = sequraWidgetsProductDetail;
                preferences.sequra_widgetsAppearence = sequraWidgetsAppearence;
                preferences.sequra_widgetURL = sequraWidgetURL;
                preferences.sequraProducts = sequraProducts;
                preferences.sequra_assetKey = sequraAssetKey;
                preferences.sequraPaymentsAvailables = sequraPaymentsAvailables;
                if (countryCode === 'ES') {
                    preferences.sequra_merchantID = sequraMerchantIDES;
                } else if (countryCode === 'PT') {
                    preferences.sequra_merchantID = sequraMerchantIDPT;
                } else if (countryCode === 'IT') {
                    preferences.sequra_merchantID = sequraMerchantIDIT;
                } else {
                    preferences.sequra_merchantID = '';
                    preferences.sequra_assetKey = '';
                }

                preferences.sequra_widgetEnabled = sequraWidgetEnabled;
                // eslint-disable-next-line no-undef
                preferences.sequra_paymentEnabled = !empty(preferences.sequra_merchantID);
            }
        }
    }


    return preferences;
}

/**
 * Get Sequra Payment Instrument.
 * @param {dw.Order.Order} order - Current User's order.
 * @returns {dw.order.PaymentInstrument} paymentInstrument - Sequra Payment Instrument.
 */
function getSequraPaymentInstrument(order) {
    var paymentInstruments = order.getPaymentInstruments('SEQURA');
    var paymentInstrument = null;
    if (paymentInstruments.length > 0) {
        paymentInstrument = paymentInstruments[0];
    }

    return paymentInstrument;
}

/**
 * Function to validate Basket JSON.
 * @param {Object} cartJSON - Basket JSON.
 * @returns {boolean} - Basket JSON is valid or not.
 */
function validateCart(cartJSON) {
    var currency = cartJSON.currency;
    var gift = cartJSON.gift;
    var orderTotalTax = cartJSON.order_total_with_tax;

    if (!currency || gift === null || !orderTotalTax) {
        return false;
    }
    var totalItemsValues = 0;
    var itemsValid = true;
    cartJSON.items.forEach(function (item) {
        if (itemsValid && item) {
            if (item.type && (!item.reference || !item.name)) {
                itemsValid = false;
            } else if (!item.type && itemsValid && (!item.reference || !item.name || (!item.price_with_tax && !item.isfree) || !item.quantity
                || (!item.total_with_tax && !item.isfree) || item.downloadable === null)) {
                itemsValid = false;
            } else {
                totalItemsValues += item.total_with_tax;
            }
        }
    });
    if (!itemsValid) {
        return false;
    } if (orderTotalTax !== totalItemsValues) {
        return false;
    }
    return true;
}

/**
 * Function to validate Shipping Method JSON.
 * @param {Object} shippingMethodJSON - Shipping Method JSON.
 * @returns {boolean} - Shipping Method JSON is valid or not.
 */
function validateShippingMethod(shippingMethodJSON) {
    if (!shippingMethodJSON.name) {
        return false;
    }
    return true;
}

/**
 * Function to validate Address JSON.
 * @param {Object} addressJSON - address JSON.
 * @returns {boolean} - address JSON is valid or not.
 */
function validateAddress(addressJSON) {
    if (addressJSON.given_names === null || addressJSON.surnames === null || !addressJSON.address_line_1
        || !addressJSON.postal_code || !addressJSON.city || !addressJSON.country_code) {
        return false;
    }

    return true;
}


/**
 * Function to validate Customer JSON.
 * @param {Object} customerJSON - Customer JSON.
 * @returns {boolean} - Customer JSON is valid or not.
 */
function validateCustomer(customerJSON) {
    var isCustomerValid = true;
    if (!customerJSON.given_names || !customerJSON.surnames || !customerJSON.email || customerJSON.logged_in === null
        || !customerJSON.language_code || !customerJSON.ip_number || !customerJSON.user_agent) {
        isCustomerValid = false;
    } else if (isCustomerValid && customerJSON.previous_orders && customerJSON.previous_orders.length) {
        customerJSON.previous_orders.forEach(function (previousOrder) {
            if (!previousOrder.created_at || !previousOrder.amount || !previousOrder.currency) {
                isCustomerValid = false;
            }
        });
    }
    return isCustomerValid;
}


/**
 * Function to validate Platform JSON.
 * @param {Object} platformJSON - Platform JSON.
 * @returns {boolean} - Platform JSON is valid or not.
 */
function validatePlatform(platformJSON) {
    if (!platformJSON.name || !platformJSON.version) {
        return false;
    }
    return true;
}

/**
 * Method to get Order Country Code.
 * @param {dw.order.Order} order - Order to process
 * @returns {string} - country Code.
 */
function getCountryOrder(order) {
    var address = order.defaultShipment ? order.defaultShipment.shippingAddress : null;
    return address ? address.countryCode.value.toUpperCase() : '';
}


/**
 * Method to get Sequra API Preferences.
 * @param {Object} infoPreferences
 * @param {dw.order.Order} order - Order to get Country Information.
 * @param {string} UUID - cart reference.
 * @returns {string} - preferences updated.
 */
function getSequraAPIPreferences(infoPreferences, order, cartReference) {
    var preferences = infoPreferences;
    if (!preferences.countryCode) {
        preferences.countryCode = this.getCountryOrder(order);
        var prefsCache = require('dw/system/CacheMgr').getCache('sequraPreferences');
        var site = require('dw/system/Site').current;
        var merchanIDPattern = '-' + site.current.ID;
        if (preferences.countryCode === 'ES') {
            preferences.sequra_merchantID = prefsCache.get('sequra_merchantID_ES' + merchanIDPattern) ? prefsCache.get('sequra_merchantID_ES' + merchanIDPattern) : site.getCustomPreferenceValue('sequra_merchantID_ES');
        } else if (preferences.countryCode === 'PT') {
            preferences.sequra_merchantID = prefsCache.get('sequra_merchantID_PT' + merchanIDPattern) ? prefsCache.get('sequra_merchantID_PT' + merchanIDPattern) : site.getCustomPreferenceValue('sequra_merchantID_PT');
        } else if (preferences.countryCode === 'IT') {
            preferences.sequra_merchantID = prefsCache.get('sequra_merchantID_IT' + merchanIDPattern) ? prefsCache.get('sequra_merchantID_IT' + merchanIDPattern) : site.getCustomPreferenceValue('sequra_merchantID_IT');
        }
    }

    if (cartReference) {
        preferences.cartReference = cartReference;
    }
    return preferences;
}

/**
 * Function to get Product Shipping Information.
 * @param {*} order
 * @returns
 */
function getOrderProductInfo(order) {
    var lineItems = order.getAllLineItems().iterator();
    var sequraProductsInfo = [];
    while (lineItems.hasNext()) {
        var lineItem = lineItems.next();
        if (lineItem instanceof dw.order.ProductLineItem) {
            var shippingStatus = lineItem.shipment.shippingStatus.value;
            var productInfo = {
                id: lineItem.productID,
                status: shippingStatus
            };
            sequraProductsInfo.push(productInfo);
        }
    }

    return sequraProductsInfo;
}

module.exports = {
    getSequraUrlLocation: getSequraUrlLocation,
    getSequraOrderId: getSequraOrderId,
    getSequraHash: getSequraHash,
    getSequraPreferences: getSequraPreferences,
    getSequraPaymentInstrument: getSequraPaymentInstrument,
    validateCart: validateCart,
    validatePlatform: validatePlatform,
    validateCustomer: validateCustomer,
    validateAddress: validateAddress,
    validateShippingMethod: validateShippingMethod,
    getCountryOrder: getCountryOrder,
    getSequraAPIPreferences: getSequraAPIPreferences,
    getOrderProductInfo: getOrderProductInfo
};
