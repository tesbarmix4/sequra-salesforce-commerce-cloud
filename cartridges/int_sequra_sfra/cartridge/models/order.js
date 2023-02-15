/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */

'use strict';

var base = module.superModule;

var SEQURA_RESOURCES = {
    pp3: dw.web.Resource.msg('selected.payment.method.pp3', 'sequra', null),
    i1: dw.web.Resource.msg('selected.payment.method.i1', 'sequra', null),
    sp1: dw.web.Resource.msg('selected.payment.method.sp1', 'sequra', null),
    pp5: dw.web.Resource.msg('selected.payment.method.pp5', 'sequra', null)
};

/**
 * Order class that represents the current order
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @param {Object} options - The current order's line items
 * @param {Object} options.config - Object to help configure the orderModel
 * @param {string} options.config.numberOfLineItems - helps determine the number of lineitems needed
 * @param {string} options.countryCode - the current request country code
 * @constructor
 */
function OrderModel(lineItemContainer, options) {
    var site = require('dw/system/Site').current;
    var merchanIDPattern = '-' + site.current.ID;
    base.call(this, lineItemContainer, options);
    this.sequraWidgetAmount = lineItemContainer.totalGrossPrice.value;
    this.sequraResources = SEQURA_RESOURCES;
    var cache = require('dw/system/CacheMgr').getCache('sequraPreferences');
    var paymentDisplay = cache ? cache.get('sequra_PaymentsDisplay' + merchanIDPattern) : null;
    this.sequra_PaymentsDisplay = paymentDisplay || dw.system.Site.current.getCustomPreferenceValue('sequraPaymentsDisplay').value;
}

OrderModel.prototype = Object.create(base.prototype);

module.exports = OrderModel;
