

// eslint-disable-next-line import/no-extraneous-dependencies
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const basketMgr = require('../dw/order/BasketMgr');

const server = {
    forms: {
        getForm: function getForm(formName) {
            return {
                formName,
                clear: function clear() {},
            };
        },
    },
};
const transaction = {
    wrap: function wrap(callBack) {
        return callBack.call();
    },
    begin: function begin() {},
    commit: function commit() {},
};
const hookMgr = {
    callHook: function callHook() {},
};
const resource = {
    msg: function msg(param1) {
        return param1;
    },
};
const status = {
    OK: 0,
    ERROR: 1,
};
const orderMgr = {
    createOrder: function createOrder() {
        return {
            order: 'new order',
        };
    },
    placeOrder: function placeOrder() {
        return status.OK;
    },
    failOrder: function failOrder() {
        return {
            order: 'failed order',
        };
    },
};
const order = {
    CONFIRMATION_STATUS_NOTCONFIRMED: 'CONFIRMATION_STATUS_NOTCONFIRMED',
    CONFIRMATION_STATUS_CONFIRMED: 'CONFIRMATION_STATUS_CONFIRMED',
    EXPORT_STATUS_READY: 'order export status is ready',
};
const paymentInstrument = {
    // eslint-disable-next-line no-new-wrappers
    METHOD_GIFT_CERTIFICATE: new String('METHOD_GIFT_CERTIFICATE'),
    // eslint-disable-next-line no-new-wrappers
    METHOD_SEQURA_I1: new String('I1'),
    // eslint-disable-next-line no-new-wrappers
    METHOD_SEQURA_PP3: new String('PP3'),
    // eslint-disable-next-line no-new-wrappers
    METHOD_SEQURA_PP5: new String('PP5'),
    // eslint-disable-next-line no-new-wrappers
    METHOD_SEQURA_SP1: new String('SP1'),
};

function proxyModel() {
    return proxyquire('../../../cartridges/int_sequra_sfra/cartridge/scripts/checkout/sequraCheckoutHelpers', {
        server,
        'dw/order/BasketMgr': basketMgr,
        'dw/util/HashMap': {},
        'dw/system/HookMgr': hookMgr,
        'dw/order/OrderMgr': orderMgr,
        'dw/order/PaymentInstrument': paymentInstrument,
        '*/cartridge/scripts/sequra/helpers/sequraApiHelpers': {
            createJSONPayload: function createJSONPayload(basket) {
                const basketJSON = {};

                const cartJSON = this.createCartJSON(basket);
                basketJSON.cart = cartJSON;

                const shippingMethodJSON = this.createShippingMethodJSON(basket);
                basketJSON.delivery_method = shippingMethodJSON;

                const shippingAddressJSON = this.createAddressJSON(basket, 'shipping');
                basketJSON.delivery_address = shippingAddressJSON;

                const billingAddressJSON = this.createAddressJSON(basket, 'billing');
                basketJSON.invoice_address = billingAddressJSON;

                const customerJSON = this.createCustomerJSON(basket);
                basketJSON.customer = customerJSON;

                const platformJSON = this.createPlatformJSON();
                basketJSON.platform = platformJSON;

                return basketJSON;
            },
            createCartJSON: function createCartJSON(basket) {
                const cartJSON = {};
                cartJSON.currency = basket.currency;
                cartJSON.gift = basket.defaultShipment.gift;
                // eslint-disable-next-line radix
                cartJSON.order_total_with_tax = basket.totalGrossPrice.value * 100;
                cartJSON.cart_ref = basket.UUID;

                const products = [];
                const lineItems = basket.getAllLineItems().iterator();
                while (lineItems.hasNext()) {
                    let itemDetail = {};
                    const lineItem = lineItems.next();
                    // eslint-disable-next-line no-undef
                    if (lineItem instanceof dw.order.ProductLineItem) {
                        itemDetail = {
                            reference: lineItem.getUUID(),
                            name: lineItem.product.name,
                            // eslint-disable-next-line radix
                            price_with_tax: lineItem.basePrice.value * 100,
                            quantity: lineItem.quantity.value,
                            // eslint-disable-next-line radix
                            total_with_tax: lineItem.getGrossPrice().value * 100,
                            downloadable: false,
                            perishable: false,
                            personalized: false,
                            restockable: true,
                            category: lineItem.getCategoryID() ? lineItem.getCategoryID() : '',
                            description: lineItem.getProduct().longDescription.toString(),
                            manufacturer: lineItem.getManufacturerName() ? lineItem.getManufacturerName() : '',
                            supplier: '',
                            product_id: lineItem.getProduct().ID,
                        };
                    // eslint-disable-next-line no-undef
                    } else if (lineItem instanceof dw.order.ShippingLineItem) {
                        itemDetail = {
                            type: 'handling',
                            reference: lineItem.ID,
                            name: lineItem.ID,
                            // eslint-disable-next-line radix
                            total_with_tax: lineItem.getGrossPrice().value * 100,
                        };
                    // eslint-disable-next-line no-undef
                    } else if (lineItem instanceof dw.order.PriceAdjustment) {
                        if (lineItem.appliedDiscount) {
                            itemDetail = {
                                type: 'discount',
                                reference: lineItem.promotionID,
                                name: lineItem.promotion.name,
                                // eslint-disable-next-line radix
                                total_with_tax: lineItem.getGrossPrice().value * 100,
                            };
                        }
                    }
                    products.push(itemDetail);
                }
                cartJSON.items = products;
                return cartJSON;
            },
            createShippingMethodJSON: function createShippingMethodJSON(basket) {
                const shippingMethodJSON = {};
                const shippingMethod = basket.defaultShipment
                    && basket.defaultShipment.shippingMethod
                    ? basket.defaultShipment.shippingMethod : null;
                if (shippingMethod) {
                    shippingMethodJSON.name = shippingMethod.ID;
                }
                return shippingMethodJSON;
            },
            createAddressJSON: function createAddressJSON(basket, type) {
                let address;
                const addressJSON = {};
                if (type === 'shipping') {
                    address = basket.defaultShipment ? basket.defaultShipment.shippingAddress
                        : null;
                } else {
                    address = basket.billingAddress;
                }

                if (address) {
                    addressJSON.given_names = address.firstName;
                    addressJSON.surnames = address.lastName;
                    addressJSON.company = '';
                    addressJSON.address_line_1 = address.address1;
                    addressJSON.address_line_2 = address.address2 ? address.address2 : '';
                    addressJSON.postal_code = address.postalCode;
                    addressJSON.city = address.city;
                    addressJSON.country_code = address.countryCode.value.toUpperCase();
                    addressJSON.phone = address.phone;
                    addressJSON.mobile_phone = '';
                    addressJSON.state = address.stateCode;
                    addressJSON.extra = '';
                    addressJSON.vat_number = '';
                }
                return addressJSON;
            },
            createCustomerJSON: function createCustomerJSON(basket) {
                const customerJSON = {};
                const { customer } = basket;
                if (customer) {
                    const firstName = customer && 'profile' in customer && customer.profile !== null && customer.profile.firstName ? customer.profile.firstName : basket.defaultShipment.shippingAddress.firstName;
                    const lastName = customer && 'profile' in customer && customer.profile !== null && customer.profile.lastName ? customer.profile.lastName : basket.defaultShipment.shippingAddress.lastName;

                    customerJSON.given_names = firstName;
                    customerJSON.surnames = lastName;
                    customerJSON.title = customer && 'profile' in customer && customer.profile !== null && customer.profile.title ? customer.profile.title : '';
                    customerJSON.email = basket.customerEmail;
                    customerJSON.logged_in = customer && customer.authenticated;
                    customerJSON.language_code = 'es_ES';
                    customerJSON.ip_number = '111.111.111';
                    customerJSON.user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0';
                    if (basket.customerNo) {
                        customerJSON.ref = basket.customerNo;
                    }
                    customerJSON.date_of_birth = customer && 'profile' in customer && customer.profile !== null && customer.profile.birthday ? customer.profile.birthday : '';
                    customerJSON.nin = '';
                    customerJSON.company = customer && 'profile' in customer && customer.profile !== null && customer.profile.companyName ? customer.profile.companyName : '';
                    customerJSON.vat_number = '';
                }

                return customerJSON;
            },
            createPlatformJSON: function createPlatformJSON() {
                const platformJSON = {};
                platformJSON.name = 'Sequra Salesforce Commerce Cloud';
                platformJSON.version = '1.0.0';
                platformJSON.plugin_version = '22.1.0';
                platformJSON.uname = '';
                platformJSON.db_name = '';
                platformJSON.db_version = '';
                platformJSON.salesforce_version = '6.0.0';
                return platformJSON;
            },
        },
        '*/cartridge/scripts/sequra/helpers/sequraHelpers': {
            validateCart: function validateCart(cartJSON) {
                const { currency } = cartJSON;
                const { gift } = cartJSON;
                const orderTotalTax = cartJSON.order_total_with_tax;

                if (!currency || gift === null || !orderTotalTax) {
                    return false;
                }
                let totalItemsValues = 0;
                let itemsValid = true;
                cartJSON.items.forEach((item) => {
                    if (item.type && (!item.reference || !item.name || !item.total_with_tax)) {
                        itemsValid = false;
                    } else if (!item.type && itemsValid && (!item.reference
                        || !item.name || !item.price_with_tax || !item.quantity
                            || !item.total_with_tax || item.downloadable === null)) {
                        itemsValid = false;
                    } else {
                        totalItemsValues += item.total_with_tax;
                    }
                });
                if (!itemsValid) {
                    return false;
                } if (orderTotalTax !== totalItemsValues) {
                    return false;
                }
                return true;
            },

            validateShippingMethod: function validateShippingMethod(shippingMethodJSON) {
                if (!shippingMethodJSON.name) {
                    return false;
                }
                return true;
            },


            validateAddress: function validateAddress(addressJSON) {
                if (!addressJSON.given_names || !addressJSON.surnames || !addressJSON.address_line_1
                    || !addressJSON.postal_code || !addressJSON.city || !addressJSON.country_code) {
                    return false;
                }

                return true;
            },

            validateCustomer: function validateCustomer(customerJSON) {
                let isCustomerValid = true;
                if (!customerJSON.given_names || !customerJSON.surnames || !customerJSON.email
                    || customerJSON.logged_in === null
                    || !customerJSON.language_code || !customerJSON.ip_number
                    || !customerJSON.user_agent) {
                    isCustomerValid = false;
                } else if (isCustomerValid && customerJSON.previous_orders
                    && customerJSON.previous_orders.length) {
                    customerJSON.previous_orders.forEach((previousOrder) => {
                        if (!previousOrder.created_at || !previousOrder.amount
                            || !previousOrder.currency) {
                            isCustomerValid = false;
                        }
                    });
                }
                return isCustomerValid;
            },

            validatePlatform: function validatePlatform(platformJSON) {
                if (!platformJSON.name || !platformJSON.version) {
                    return false;
                }
                return true;
            },
        },
        'dw/order/PaymentMgr': {
            getApplicablePaymentMethods: function getApplicablePaymentMethods() {
                return [{
                    ID: 'GIFT_CERTIFICATE',
                    name: 'Gift Certificate',
                }, {
                    ID: 'i1',
                    name: 'Paga después',
                },
                {
                    ID: 'sp1',
                    name: 'Divide en 3',
                },
                {
                    ID: 'pp5',
                    name: 'Pago aplazado',
                },
                {
                    ID: 'pp3',
                    name: 'Paga fraccionado',
                }];
            },
            getPaymentMethod: function getPaymentMethod() {
                return {
                    getApplicablePaymentCards: function getApplicablePaymentCards() {
                        return [{
                            cardType: 'Visa',
                            name: 'Visa',
                            UUID: 'some UUID',
                        }, {
                            cardType: 'Amex',
                            name: 'American Express',
                            UUID: 'some UUID',
                        }, {
                            cardType: 'Master Card',
                            name: 'MasterCard',
                        }, {
                            cardType: 'Discover',
                            name: 'Discover',
                        }];
                    },
                };
            },
            getApplicablePaymentCards: function getApplicablePaymentCards() {
                return ['Visa'];
            },
            getPaymentCard: function getPaymentCard() {
                return 'Visa';
            },
        },
        'dw/order/Order': order,
        'dw/system/Status': status,
        'dw/web/Resource': resource,
        'dw/system/Site': {},
        'dw/util/Template': {},
        'dw/system/Transaction': transaction,
    });
}

module.exports = proxyModel();
