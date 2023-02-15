/* eslint-disable radix */

'use strict';


var sequraObjectsHelpers = require('*/cartridge/scripts/sequra/helpers/sequraObjectsHelpers');

/**
 * Creates Checkout JSON data
 * @param {dw.order.Order} order - user's Order
 * @param {string} sequraOrderStatus - Sequra Order Status (String containing state of the order.
 * Allowed values are null (indicating no change) and 'confirmed'. (string or null))
 * @param {Array} preferences - Array of Sequra Preferences.
 * @returns {Object} Order JSON
 */
function createSequraRequest(order, sequraOrderStatus, preferences) {
    var checkoutJSON = {};
    checkoutJSON.order = {};

    checkoutJSON.order.state = sequraOrderStatus;

    checkoutJSON.order.merchant_reference = {
        order_ref_1: order.orderNo
    };
    var merchantJSON = sequraObjectsHelpers.createMerchantJSON(order, preferences);
    checkoutJSON.order.merchant = merchantJSON;

    var basketCreatedJSON = sequraObjectsHelpers.createJSONPayload(order);

    if ('cartReference' in preferences) {
        basketCreatedJSON.cart.cart_ref = preferences.cartReference;
    }

    checkoutJSON.order.cart = basketCreatedJSON.cart;
    checkoutJSON.order.delivery_method = basketCreatedJSON.delivery_method;
    checkoutJSON.order.delivery_address = basketCreatedJSON.delivery_address;
    checkoutJSON.order.invoice_address = basketCreatedJSON.invoice_address;
    checkoutJSON.order.customer = basketCreatedJSON.customer;
    checkoutJSON.order.gui = basketCreatedJSON.gui;
    checkoutJSON.order.platform = basketCreatedJSON.platform;

    return checkoutJSON;
}

/**
 * Creates full Basket Payload JSON data
 * @param {dw.order.Basket} basket - user's basket
 * @param {Array} preferences - Array of Sequra Preferences.
 * @returns {Object} Basket JSON
 */
function createSequraRequestBasket(basket, preferences) {
    var checkoutJSON = {};
    checkoutJSON.order = {};

    checkoutJSON.order.state = '';

    var merchantJSON = sequraObjectsHelpers.createMerchantJSONFromBasket(basket, preferences);
    checkoutJSON.order.merchant = merchantJSON;

    var basketCreatedJSON = sequraObjectsHelpers.createJSONPayload(basket);

    checkoutJSON.order.cart = basketCreatedJSON.cart;
    checkoutJSON.order.delivery_method = basketCreatedJSON.delivery_method;
    checkoutJSON.order.delivery_address = basketCreatedJSON.delivery_address;
    checkoutJSON.order.invoice_address = basketCreatedJSON.invoice_address;
    checkoutJSON.order.customer = basketCreatedJSON.customer;
    checkoutJSON.order.gui = basketCreatedJSON.gui;
    checkoutJSON.order.platform = basketCreatedJSON.platform;

    return checkoutJSON;
}

/**
 * Creates Order JSON to Update.
 * @param {dw.order.Order} order - user's order
 * @param {Array} preferences - Array of Sequra Preferences.
 * @returns {Object} Order Update JSON
 */
function createSequraUpdateRequest(order, preferences) {
    var orderJSON = {};
    orderJSON.order = {};

    var unshippedCart = {};
    var shippedCart = {};

    var merchantJSON = sequraObjectsHelpers.createMerchantJSON(order, preferences);
    orderJSON.order.merchant = merchantJSON;

    orderJSON.order.merchant_reference = {
        order_ref_1: order.orderNo
    };

    var shippingMethodJSON = sequraObjectsHelpers.createShippingMethodJSON(order);
    orderJSON.order.delivery_method = shippingMethodJSON;

    var shippingAddressJSON = sequraObjectsHelpers.createAddressJSON(order, 'shipping');
    orderJSON.order.delivery_address = shippingAddressJSON;

    var billingAddressJSON = sequraObjectsHelpers.createAddressJSON(order, 'billing');
    orderJSON.order.invoice_address = billingAddressJSON;

    var customerJSON = sequraObjectsHelpers.createCustomerJSON(order);
    orderJSON.order.customer = customerJSON;

    var guiJSON = sequraObjectsHelpers.createGUIJSON();
    orderJSON.order.gui = guiJSON;

    var platformJSON = sequraObjectsHelpers.createPlatformJSON();
    orderJSON.order.platform = platformJSON;

    var currency = order.getCurrencyCode();
    var productsShipped = [];
    var totalShippedWithTax = 0;
    var productsUnShipped = [];
    var totalUnShippedWithTax = 0;

    unshippedCart.currency = currency;
    shippedCart.currency = currency;

    var taxationPolicy = dw.order.TaxMgr.getTaxationPolicy();

    if (order.status.value === dw.order.Order.ORDER_STATUS_CANCELLED) {
        unshippedCart.order_total_with_tax = 0;
        unshippedCart.items = productsUnShipped;
        shippedCart.order_total_with_tax = 0;
        shippedCart.items = productsShipped;
        orderJSON.order.cancellation_reason = 'customer_cancel';
    } else {
        var listShippingShipped = [];
        var listShippingUnShipped = [];
        var listPromoShipped = [];
        var listPromoUnShipped = [];
        var tempOrdersPromotions = [];

        var lineItems = order.getAllLineItems().iterator();
        while (lineItems.hasNext()) {
            var itemDetail = {};
            var lineItem = lineItems.next();
            if (lineItem instanceof dw.order.ProductLineItem) {
                var shippingStatus = lineItem.shipment.shippingStatus.value;
                var money;
                if (taxationPolicy === dw.order.TaxMgr.TAX_POLICY_GROSS) {
                    money = new dw.value.Money(lineItem.basePrice.value, currency);
                } else {
                    money = new dw.value.Money(lineItem.basePrice.value + (lineItem.tax.value / lineItem.quantity.value), currency);
                }

                itemDetail = {
                    reference: lineItem.productID,
                    name: lineItem.productName,
                    price_with_tax: sequraObjectsHelpers.getMoneyValue(money, currency).value,
                    quantity: lineItem.quantity.value,
                    total_with_tax: sequraObjectsHelpers.getMoneyValue(lineItem.getGrossPrice(), currency).value,
                    downloadable: false,
                    perishable: false,
                    personalized: false,
                    restockable: true,
                    category: lineItem.getCategoryID() ? lineItem.getCategoryID() : '',
                    description: lineItem.getProduct() && lineItem.getProduct().longDescription ? lineItem.getProduct().longDescription.toString() : lineItem.productName,
                    manufacturer: lineItem.getManufacturerName() ? lineItem.getManufacturerName() : '',
                    supplier: '',
                    product_id: lineItem.productID,
                    url: dw.web.URLUtils.https('Product-Show', 'pid', lineItem.productID).toString(),
                    isfree: lineItem.bundledProductLineItem || lineItem.bonusProductLineItem
                };
                if (itemDetail && 'total_with_tax' in itemDetail) {
                    if (shippingStatus === dw.order.Shipment.SHIPPING_STATUS_SHIPPED) {
                        totalShippedWithTax += itemDetail.total_with_tax;
                        productsShipped.push(itemDetail);
                    } else if (shippingStatus === dw.order.Shipment.SHIPPING_STATUS_NOTSHIPPED) {
                        totalUnShippedWithTax += itemDetail.total_with_tax;
                        productsUnShipped.push(itemDetail);
                    }
                }

                // PROCESS PRODUCT PROMOTIONS.
                var pricesAdjustments = lineItem.getPriceAdjustments();
                var pricesAdjustmensIterator;
                if (pricesAdjustments && !pricesAdjustments.isEmpty()) {
                    pricesAdjustmensIterator = pricesAdjustments.iterator();
                    if (pricesAdjustmensIterator) {
                        while (pricesAdjustmensIterator.hasNext()) {
                            if (shippingStatus === dw.order.Shipment.SHIPPING_STATUS_SHIPPED) {
                                var pricesAdjustmensItemShipped = pricesAdjustmensIterator.next();
                                if (pricesAdjustmensItemShipped.appliedDiscount && pricesAdjustmensItemShipped.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_ORDER) {
                                    listPromoShipped.push(pricesAdjustmensItemShipped.promotion.UUID);
                                }
                                if (pricesAdjustmensItemShipped.appliedDiscount && pricesAdjustmensItemShipped.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_PRODUCT) {
                                    itemDetail = {
                                        type: 'discount',
                                        reference: pricesAdjustmensItemShipped.promotionID,
                                        name: pricesAdjustmensItemShipped.promotion ? pricesAdjustmensItemShipped.promotion.name : pricesAdjustmensItemShipped.promotionID,
                                        total_with_tax: sequraObjectsHelpers.getMoneyValue(pricesAdjustmensItemShipped.getGrossPrice(), currency).value
                                    };
                                    totalShippedWithTax += itemDetail.total_with_tax;
                                    productsShipped.push(itemDetail);
                                }
                            } else if (shippingStatus === dw.order.Shipment.SHIPPING_STATUS_NOTSHIPPED) {
                                while (pricesAdjustmensIterator.hasNext()) {
                                    var pricesAdjustmensItemUnShipped = pricesAdjustmensIterator.next();
                                    if (pricesAdjustmensItemUnShipped.appliedDiscount && pricesAdjustmensItemUnShipped.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_ORDER) {
                                        listPromoUnShipped.push(pricesAdjustmensItemUnShipped.promotion.UUID);
                                    }
                                    if (pricesAdjustmensItemUnShipped.appliedDiscount && pricesAdjustmensItemUnShipped.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_PRODUCT) {
                                        itemDetail = {
                                            type: 'discount',
                                            reference: pricesAdjustmensItemUnShipped.promotionID,
                                            name: pricesAdjustmensItemUnShipped.promotion ? pricesAdjustmensItemUnShipped.promotion.name : pricesAdjustmensItemUnShipped.promotionID,
                                            total_with_tax: sequraObjectsHelpers.getMoneyValue(pricesAdjustmensItemUnShipped.getGrossPrice(), currency).value
                                        };
                                        totalUnShippedWithTax += itemDetail.total_with_tax;
                                        productsUnShipped.push(itemDetail);
                                    }
                                }
                            }
                        }
                    }
                }

                // PROCESS SHIPMENTS
                var shipmentPI = lineItem.getShipment();
                var shipIterator = shipmentPI ? shipmentPI.getShippingLineItems().iterator() : null;
                if (shipmentPI) {
                    if (shippingStatus === dw.order.Shipment.SHIPPING_STATUS_SHIPPED) {
                        while (shipIterator.hasNext()) {
                            var shipLineItemShipped = shipIterator.next();
                            if (listShippingShipped.indexOf(shipLineItemShipped.UUID) === -1) {
                                listShippingShipped.push(shipLineItemShipped.UUID);

                                // PROCESS SHIPPING PROMOTIONS.
                                var pricesShippingShippedAdjustments = shipLineItemShipped.getShippingPriceAdjustments();
                                if (pricesShippingShippedAdjustments && !pricesShippingShippedAdjustments.isEmpty()) {
                                    var pricesShippingShippedAdjustmentsIterator = pricesShippingShippedAdjustments.iterator();
                                    while (pricesShippingShippedAdjustmentsIterator.hasNext()) {
                                        var shippingShippedAdjustments = pricesShippingShippedAdjustmentsIterator.next();
                                        if (shippingShippedAdjustments.appliedDiscount && shippingShippedAdjustments.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_SHIPPING) {
                                            listPromoShipped.push(shippingShippedAdjustments.promotion.UUID);
                                            itemDetail = {
                                                type: 'discount',
                                                reference: shippingShippedAdjustments.promotionID,
                                                name: shippingShippedAdjustments.promotion ? shippingShippedAdjustments.promotion.name : shippingShippedAdjustments.promotionID,
                                                total_with_tax: sequraObjectsHelpers.getMoneyValue(shippingShippedAdjustments.getGrossPrice(), currency).value
                                            };
                                            totalShippedWithTax += itemDetail.total_with_tax;
                                            productsShipped.push(itemDetail);
                                        }
                                    }
                                }
                            }
                        }
                    } else if (shippingStatus === dw.order.Shipment.SHIPPING_STATUS_NOTSHIPPED) {
                        while (shipIterator.hasNext()) {
                            var shipLineItemUnShipped = shipIterator.next();
                            if (listShippingUnShipped.indexOf(shipLineItemUnShipped.UUID) === -1) {
                                listShippingUnShipped.push(shipLineItemUnShipped.UUID);

                                // PROCESS SHIPPING PROMOTIONS.
                                var pricesShippingUnShippedAdjustments = shipLineItemUnShipped.getShippingPriceAdjustments();
                                if (pricesShippingUnShippedAdjustments && !pricesShippingUnShippedAdjustments.isEmpty()) {
                                    var pricesShippingUnShippedAdjustmentsIterator = pricesShippingUnShippedAdjustments.iterator();
                                    while (pricesShippingUnShippedAdjustmentsIterator.hasNext()) {
                                        var shippingUnShippedAdjustments = pricesShippingUnShippedAdjustmentsIterator.next();
                                        if (shippingUnShippedAdjustments.appliedDiscount && shippingUnShippedAdjustments.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_SHIPPING) {
                                            listPromoUnShipped.push(shippingUnShippedAdjustments.promotion.UUID);
                                            itemDetail = {
                                                type: 'discount',
                                                reference: shippingUnShippedAdjustments.promotionID,
                                                name: shippingUnShippedAdjustments.promotion ? shippingUnShippedAdjustments.promotion.name : shippingUnShippedAdjustments.promotionID,
                                                total_with_tax: sequraObjectsHelpers.getMoneyValue(shippingUnShippedAdjustments.getGrossPrice(), currency).value
                                            };
                                            totalUnShippedWithTax += itemDetail.total_with_tax;
                                            productsUnShipped.push(itemDetail);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (lineItem instanceof dw.order.ShippingLineItem) {
                itemDetail = {
                    type: 'handling',
                    reference: lineItem.ID,
                    name: lineItem.ID,
                    total_with_tax: sequraObjectsHelpers.getMoneyValue(lineItem.getGrossPrice(), currency).value
                };
                if (listShippingShipped.indexOf(lineItem.UUID) !== -1) {
                    totalShippedWithTax += itemDetail.total_with_tax;
                    productsShipped.push(itemDetail);
                }
                if (listShippingUnShipped.indexOf(lineItem.UUID) !== -1) {
                    totalUnShippedWithTax += itemDetail.total_with_tax;
                    productsUnShipped.push(itemDetail);
                }
            } else if (lineItem instanceof dw.order.ProductShippingLineItem) {
                itemDetail = {
                    type: 'handling',
                    reference: lineItem.UUID,
                    name: lineItem.UUID,
                    total_with_tax: sequraObjectsHelpers.getMoneyValue(lineItem.getGrossPrice(), currency).value
                };
                var shipment = lineItem.getShipment();
                if (shipment) {
                    var status = shipment.getShippingStatus();
                    if (status && status.value === dw.order.Shipment.SHIPPING_STATUS_SHIPPED) {
                        totalShippedWithTax += itemDetail.total_with_tax;
                        productsShipped.push(itemDetail);
                    } else if (status && status.value === dw.order.Shipment.SHIPPING_STATUS_NOTSHIPPED) {
                        totalUnShippedWithTax += itemDetail.total_with_tax;
                        productsUnShipped.push(itemDetail);
                    }
                }
            } else if (lineItem instanceof dw.order.PriceAdjustment) {
                if (lineItem.appliedDiscount) {
                    itemDetail = {
                        type: 'discount',
                        reference: lineItem.promotionID,
                        name: lineItem.promotion ? lineItem.promotion.name : lineItem.promotionID,
                        total_with_tax: sequraObjectsHelpers.getMoneyValue(lineItem.getGrossPrice(), currency).value
                    };
                    if (lineItem.promotion.promotionClass === dw.campaign.Promotion.PROMOTION_CLASS_ORDER) {
                        if (listPromoShipped.indexOf(lineItem.promotion.UUID) === -1 && listPromoUnShipped.indexOf(lineItem.promotion.UUID) === -1) {
                            tempOrdersPromotions.push(itemDetail);
                        } else if (listPromoShipped.indexOf(lineItem.promotion.UUID) !== -1) {
                            totalShippedWithTax += itemDetail.total_with_tax;
                            productsShipped.push(itemDetail);
                        } else if (listPromoUnShipped.indexOf(lineItem.promotion.UUID) !== -1) {
                            totalUnShippedWithTax += itemDetail.total_with_tax;
                            productsUnShipped.push(itemDetail);
                        }
                    }
                }
            }
        }

        if (productsUnShipped && productsUnShipped.length) {
            unshippedCart.order_total_with_tax = totalUnShippedWithTax;
        } else {
            unshippedCart.order_total_with_tax = 0;
        }


        if (productsShipped && productsShipped.length) {
            shippedCart.order_total_with_tax = totalShippedWithTax;
        } else {
            shippedCart.order_total_with_tax = 0;
        }

        if (tempOrdersPromotions && tempOrdersPromotions.length) {
            for (var i = 0; i < tempOrdersPromotions.length; i += 1) {
                var itemPromo = tempOrdersPromotions[i];
                var futureUnshippedValue = unshippedCart.order_total_with_tax + itemPromo.total_with_tax;
                if (futureUnshippedValue > 0) {
                    totalUnShippedWithTax += itemPromo.total_with_tax;
                    productsUnShipped.push(itemPromo);
                    unshippedCart.order_total_with_tax = totalUnShippedWithTax;
                } else {
                    totalShippedWithTax += itemPromo.total_with_tax;
                    productsShipped.push(itemPromo);
                    shippedCart.order_total_with_tax = totalShippedWithTax;
                }
            }
        }

        unshippedCart.items = productsUnShipped;
        shippedCart.items = productsShipped;
    }
    orderJSON.order.unshipped_cart = unshippedCart;
    orderJSON.order.shipped_cart = shippedCart;

    return orderJSON;
}

/**
 * Creates Order JSON to Cancel.
 * @param {dw.order.Order} order - user's order
 * @param {Object} data with Cancellation Info.
 * @param {Array} preferences - Array of Sequra Preferences.
 * @returns {Object} Order Cancellation JSON
 */
function createSequraCancelRequest(order, data, preferences) {
    var orderJSON = {};
    orderJSON.order = {};

    var unshippedCart = {};
    var shippedCart = {};

    var merchantJSON = sequraObjectsHelpers.createMerchantJSON(order, preferences);
    orderJSON.order.merchant = merchantJSON;

    orderJSON.order.merchant_reference = {
        order_ref_1: order.orderNo
    };

    var shippingMethodJSON = sequraObjectsHelpers.createShippingMethodJSON(order);
    orderJSON.order.delivery_method = shippingMethodJSON;

    var shippingAddressJSON = sequraObjectsHelpers.createAddressJSON(order, 'shipping');
    orderJSON.order.delivery_address = shippingAddressJSON;

    var billingAddressJSON = sequraObjectsHelpers.createAddressJSON(order, 'billing');
    orderJSON.order.invoice_address = billingAddressJSON;

    var customerJSON = sequraObjectsHelpers.createCustomerJSON(order);
    orderJSON.order.customer = customerJSON;

    var guiJSON = sequraObjectsHelpers.createGUIJSON();
    orderJSON.order.gui = guiJSON;

    var platformJSON = sequraObjectsHelpers.createPlatformJSON();
    orderJSON.order.platform = platformJSON;

    var currency = order.getCurrencyCode();
    var productsShipped = [];
    var productsUnShipped = [];


    unshippedCart.currency = currency;
    shippedCart.currency = currency;

    unshippedCart.order_total_with_tax = 0;
    unshippedCart.items = productsUnShipped;
    shippedCart.order_total_with_tax = 0;
    shippedCart.items = productsShipped;
    orderJSON.order.cancellation_reason = data.cancellationReason;

    orderJSON.order.unshipped_cart = unshippedCart;
    orderJSON.order.shipped_cart = shippedCart;

    return orderJSON;
}

module.exports = {
    createSequraRequest: createSequraRequest,
    createSequraRequestBasket: createSequraRequestBasket,
    createSequraUpdateRequest: createSequraUpdateRequest,
    createSequraCancelRequest: createSequraCancelRequest,
    createJSONPayload: sequraObjectsHelpers.createJSONPayload
};
