/* eslint-disable radix */

'use strict';

var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger').getLogger('Sequra', 'sequra');


/**
 * Method that get the amount of money in the correct format.
 * @param {*} amount - Amount of money
 * @param {*} currency - Basket Currency.
 * @returns Money-
 */
function getMoneyValue(amount, currency) {
    var currencyCode = dw.util.Currency.getCurrency(currency);
    var value = Math.round(amount.multiply(Math.pow(10, 2)).value); // eslint-disable-line no-restricted-properties

    return new dw.value.Money(value, currencyCode);
}

/**
 * Creates a Merchant JSON
 * @param {dw.order.Basket} basket - user's basket
 * @param {Array} preferences - Array of Sequra Preferences.
 * @returns {Object} Merchant JSON
 */
function createMerchantJSONFromBasket(basket, preferences) {
    var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
    var orderSignature = sequraHelpers.getSequraHash(basket.getUUID());

    var merchantJSON = {};
    merchantJSON.id = preferences.sequra_merchantID !== null ? preferences.sequra_merchantID : '';

    merchantJSON.notify_url = URLUtils.https('Sequra-IPN').toString();
    merchantJSON.notification_parameters = {
        sequraOrderReference: basket.getUUID(),
        sequraOrderSignature: orderSignature
    };

    return merchantJSON;
}


/**
 * Creates a Merchant JSON
 * @param {dw.order.Order} order - user's Order
 * @param {Array} preferences - Array of Sequra Preferences.
 * @returns {Object} Merchant JSON
 */
function createMerchantJSON(order, preferences) {
    var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
    var merchantJSON = {};
    merchantJSON.id = preferences.sequra_merchantID !== null ? preferences.sequra_merchantID : '';
    merchantJSON.notify_url = URLUtils.https('Sequra-IPN').toString();
    var signature = sequraHelpers.getSequraHash(order.getOrderNo());
    merchantJSON.notification_parameters = {
        signature: signature,
        orderID: order.getOrderNo(),
        orderToken: order.getOrderToken()
    };
    merchantJSON.abort_url = URLUtils.https('Sequra-AbortOrder', 'orderID', order.getOrderNo(), 'orderToken', order.getOrderToken()).toString();
    merchantJSON.return_url = URLUtils.https('Sequra-ShowConfirmation', 'orderID', order.getOrderNo(), 'orderToken', order.getOrderToken()).toString();
    merchantJSON.approved_url = URLUtils.https('Sequra-ShowConfirmation', 'orderID', order.getOrderNo(), 'orderToken', order.getOrderToken()).toString();
    merchantJSON.events_webhook = {
        url: URLUtils.https('Sequra-Events').toString(),
        parameters: {
            signature: signature,
            orderID: order.getOrderNo(),
            orderToken: order.getOrderToken()
        }
    };

    return merchantJSON;
}

/**
 * Creates the Order Shipping Method JSON
 * @param {dw.order.Basket} basket - user's basket
 * @returns {Object} shipping method information JSON
 */
function createShippingMethodJSON(basket) {
    var shippingMethodJSON = {};
    var shippingMethod = basket.defaultShipment && basket.defaultShipment.shippingMethod ? basket.defaultShipment.shippingMethod : null;
    if (shippingMethod) {
        shippingMethodJSON.name = shippingMethod.ID;
        shippingMethodJSON.home_delivery = !('storePickupEnabled' in shippingMethod.custom && shippingMethod.custom.storePickupEnabled);
    }
    return shippingMethodJSON;
}

/**
 * Creates the Order Address JSON
 * @param {dw.order.Basket} basket - user's basket
 * @param {String} type - Shipping or Billing address.
 * @returns {Object} Order Address information JSON
 */
function createAddressJSON(basket, type) {
    var address;
    var addressJSON = {};
    if (type === 'shipping') {
        address = basket.defaultShipment ? basket.defaultShipment.shippingAddress : null;
    } else {
        address = basket.getBillingAddress();
    }

    addressJSON.given_names = address && address.firstName ? address.firstName : '';
    addressJSON.surnames = address && address.lastName ? address.lastName : '';
    addressJSON.company = '';
    addressJSON.address_line_1 = address && address.address1 ? address.address1 : '';
    addressJSON.address_line_2 = address && address.address2 ? address.address2 : '';
    addressJSON.postal_code = address && address.postalCode ? address.postalCode : '';
    addressJSON.city = address && address.city ? address.city : '';
    addressJSON.country_code = address && address.countryCode && address.countryCode.value ? address.countryCode.value.toUpperCase() : '';
    addressJSON.phone = address && address.phone ? address.phone : '';
    addressJSON.mobile_phone = address && address.phone ? address.phone : '';
    addressJSON.state = address && address.stateCode ? address.stateCode : '';
    addressJSON.extra = '';
    addressJSON.vat_number = '';

    return addressJSON;
}

/**
 * Creates the JSON with customer's previous orders
 * @param {dw.customer.Customer} customer - Customer
 * @param {object} currentOrder - Current Order.
 * @returns {Object} order history information JSON
 */
function createOrderHistory(customer, currentOrder) {
    var orders = [];
    try {
        if (customer && 'profile' in customer && customer.profile !== null) {
            var orderHistory = customer.getOrderHistory();
            if (orderHistory) {
                var customerOrders = orderHistory.getOrders(
                    'status!={0} AND status!={1}',
                    'creationDate desc',
                    dw.order.Order.ORDER_STATUS_REPLACED,
                    dw.order.Order.ORDER_STATUS_FAILED
                );

                var currentOrderId = '';
                if (currentOrder instanceof dw.order.Order) {
                    currentOrderId = currentOrder.orderNo;
                }

                while (customerOrders.hasNext()) {
                    var order = customerOrders.next();
                    if (order.getTotalGrossPrice().value > 0 && currentOrderId !== order.orderNo) {
                        var shipment = order.getDefaultShipment();
                        var orderInfo = {
                            created_at: order.getCreationDate(),
                            amount: getMoneyValue(order.getTotalGrossPrice(), order.getCurrencyCode()).value,
                            currency: order.getCurrencyCode(),
                            raw_status: shipment.shippingStatus.displayValue,
                            status: shipment.shippingStatus.displayValue,
                            postal_code: shipment.shippingAddress && shipment.shippingAddress.postalCode ? shipment.shippingAddress.postalCode : '',
                            country_code: shipment.shippingAddress.countryCode.value.toUpperCase()
                        };
                        orders.push(orderInfo);
                    }
                }
                customerOrders.close();
            }
        }
    } catch (e) {
        Logger.error('Sequra Error creatin Order History', e.toString());
    }

    return orders;
}

/**
 * Creates the Customer JSON
 * @param {dw.order.Basket} basket - user's basket
 * @returns {Object} customer information JSON
 */
function createCustomerJSON(basket) {
    var customerJSON = {};
    var customer = basket.getCustomer();
    if (customer) {
        var firstName = '';
        var lastName = '';
        if (customer && 'profile' in customer && customer.profile !== null && customer.profile.firstName && customer.profile.lastName) {
            firstName = customer.profile.firstName;
            lastName = customer.profile.lastName;
        } else if (basket.defaultShipment && basket.defaultShipment.shippingAddress && basket.defaultShipment.shippingAddress.firstName && basket.defaultShipment.shippingAddress.lastName) {
            firstName = basket.defaultShipment.shippingAddress.firstName;
            lastName = basket.defaultShipment.shippingAddress.lastName;
        } else if (basket.getBillingAddress() && basket.getBillingAddress().firstName && basket.getBillingAddress().lastName) {
            firstName = basket.getBillingAddress().firstName;
            lastName = basket.getBillingAddress().lastName;
        }

        var sequraBirthDay = '';
        var birthDay = customer && 'profile' in customer && customer.profile !== null && customer.profile.birthday ? customer.profile.birthday : '';
        if (birthDay) {
            var month = birthDay.getMonth() + 1;
            sequraBirthDay = birthDay.getFullYear() + '-' + month + '-' + birthDay.getDate();
        }

        customerJSON.given_names = firstName;
        customerJSON.surnames = lastName;
        customerJSON.title = customer && 'profile' in customer && customer.profile !== null && customer.profile.title ? customer.profile.title : '';
        var email = basket.getCustomerEmail();
        if (!email) {
            email = customer && 'profile' in customer && customer.profile !== null ? customer.profile.email : '';
        }
        customerJSON.email = email;
        customerJSON.logged_in = customer && customer.authenticated;
        customerJSON.language_code = request.locale;
        customerJSON.ip_number = request.httpRemoteAddress;
        customerJSON.user_agent = request.httpUserAgent;
        if (basket.getCustomerNo()) {
            customerJSON.ref = basket.getCustomerNo();
        }
        customerJSON.date_of_birth = sequraBirthDay;
        customerJSON.nin = '';
        customerJSON.company = customer && 'profile' in customer && customer.profile !== null && customer.profile.companyName ? customer.profile.companyName : '';
        customerJSON.vat_number = '';

        customerJSON.previous_orders = createOrderHistory(customer, basket);
    }

    return customerJSON;
}

/**
 * Creates the Basket JSON
 * @param {dw.order.Basket} basket - user's basket
 * @returns {Object} Basket JSON information JSON
 */
function createCartJSON(basket) {
    var cartJSON = {};
    cartJSON.currency = basket.getCurrencyCode();
    cartJSON.gift = basket.defaultShipment.gift;
    cartJSON.order_total_with_tax = getMoneyValue(basket.getTotalGrossPrice(), cartJSON.currency).value;
    cartJSON.cart_ref = basket.getUUID();
    cartJSON.created_at = basket.getCreationDate();
    var taxationPolicy = dw.order.TaxMgr.getTaxationPolicy();
    var products = [];
    var lineItems = basket.getAllLineItems().iterator();
    while (lineItems.hasNext()) {
        var itemDetail = {};
        var lineItem = lineItems.next();
        if (lineItem instanceof dw.order.ProductLineItem) {
            var money;
            if (taxationPolicy === dw.order.TaxMgr.TAX_POLICY_GROSS) {
                money = new dw.value.Money(lineItem.basePrice.value, cartJSON.currency);
            } else {
                money = new dw.value.Money(lineItem.basePrice.value + (lineItem.tax.value / lineItem.quantity.value), cartJSON.currency);
            }

            itemDetail = {
                reference: lineItem.productID,
                name: lineItem.productName,
                price_with_tax: getMoneyValue(money, cartJSON.currency).value,
                quantity: lineItem.quantity.value,
                total_with_tax: getMoneyValue(lineItem.getGrossPrice(), cartJSON.currency).value,
                downloadable: false,
                perishable: false,
                personalized: false,
                restockable: true,
                category: lineItem.getCategoryID() ? lineItem.getCategoryID() : '',
                description: lineItem.getProduct().longDescription ? lineItem.getProduct().longDescription.toString() : '',
                manufacturer: lineItem.getManufacturerName() ? lineItem.getManufacturerName() : '',
                supplier: '',
                product_id: lineItem.productID,
                url: URLUtils.https('Product-Show', 'pid', lineItem.productID).toString(),
                isfree: lineItem.bundledProductLineItem || lineItem.bonusProductLineItem
            };
        } else if (lineItem instanceof dw.order.ShippingLineItem) {
            itemDetail = {
                type: 'handling',
                reference: lineItem.ID,
                name: lineItem.ID,
                total_with_tax: getMoneyValue(lineItem.getGrossPrice(), cartJSON.currency).value
            };
        } else if (lineItem instanceof dw.order.ProductShippingLineItem) {
            itemDetail = {
                type: 'handling',
                reference: lineItem.UUID,
                name: lineItem.UUID,
                total_with_tax: getMoneyValue(lineItem.getGrossPrice(), cartJSON.currency).value
            };
        } else if (lineItem instanceof dw.order.PriceAdjustment) {
            if (lineItem.appliedDiscount) {
                itemDetail = {
                    type: 'discount',
                    reference: lineItem.promotionID,
                    name: lineItem.promotion ? lineItem.promotion.name : lineItem.promotionID,
                    total_with_tax: getMoneyValue(lineItem.getGrossPrice(), cartJSON.currency).value
                };
            }
        }
        if (itemDetail && 'total_with_tax' in itemDetail) {
            products.push(itemDetail);
        }
    }
    cartJSON.items = products;
    return cartJSON;
}

/**
 * Create the Platform JSON
 * @returns {Object} platform information JSON
 */
function createPlatformJSON() {
    var platformJSON = {};
    var infoCartridge = require('*/cartridge/scripts/constants/sequraConstants.js');
    platformJSON.name = infoCartridge.NAME;
    platformJSON.version = infoCartridge.VERSION;
    platformJSON.plugin_version = infoCartridge.VERSION;
    platformJSON.uname = '';
    platformJSON.db_name = '';
    platformJSON.db_version = '';
    platformJSON.salesforce_version = Resource.msg('global.version.number', 'version', null);
    return platformJSON;
}

/**
 * Create the GUI JSON
 * @returns {Object} gui information JSON
 */
function createGUIJSON() {
    var guiJSON = {};
    var deviceType = 'desktop';
    var iPhoneDevice = 'iPhone';
    var iPadDevice = 'iPad';
    var androidDevice = 'Android';
    var httpUserAgent = request.httpUserAgent;

    if (httpUserAgent && httpUserAgent.indexOf(iPhoneDevice) > -1) {
        deviceType = 'mobile';
    } else if (httpUserAgent && httpUserAgent.indexOf(androidDevice) > -1) {
        if (httpUserAgent.toLowerCase().indexOf('mobile') > -1) {
            deviceType = 'mobile';
        }
    } else if (httpUserAgent && httpUserAgent.indexOf(iPadDevice) > -1) {
        deviceType = 'tablet';
    }

    guiJSON.layout = deviceType;

    return guiJSON;
}

/**
 * Create JSON with basket to Validate the payment.
 * @param {dw.order.Basket} basket - user's basket
 * @returns {Object} Basket JSON
 */
function createJSONPayload(basket) {
    var basketJSON = {};

    var cartJSON = createCartJSON(basket);
    basketJSON.cart = cartJSON;

    var shippingMethodJSON = createShippingMethodJSON(basket);
    basketJSON.delivery_method = shippingMethodJSON;

    var shippingAddressJSON = createAddressJSON(basket, 'shipping');
    basketJSON.delivery_address = shippingAddressJSON;

    var billingAddressJSON = createAddressJSON(basket, 'billing');
    basketJSON.invoice_address = billingAddressJSON;

    var customerJSON = createCustomerJSON(basket);
    basketJSON.customer = customerJSON;

    var guiJSON = createGUIJSON();
    basketJSON.gui = guiJSON;

    var platformJSON = createPlatformJSON();
    basketJSON.platform = platformJSON;

    return basketJSON;
}

module.exports = {
    createJSONPayload: createJSONPayload,
    createGUIJSON: createGUIJSON,
    createPlatformJSON: createPlatformJSON,
    createCartJSON: createCartJSON,
    createCustomerJSON: createCustomerJSON,
    createOrderHistory: createOrderHistory,
    createAddressJSON: createAddressJSON,
    createShippingMethodJSON: createShippingMethodJSON,
    createMerchantJSON: createMerchantJSON,
    createMerchantJSONFromBasket: createMerchantJSONFromBasket,
    getMoneyValue: getMoneyValue
};