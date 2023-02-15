/* eslint-disable consistent-return */

'use strict';

/*
 * Script to run Sequra related jobs
 */

/* API Includes */
var logger = require('dw/system/Logger').getLogger('Sequra', 'Sequra');
var Order = require('dw/order/Order');


function createLogMessage(orderInfo) {
    var orderInformation = JSON.parse(orderInfo);
    var msg = '';
    msg = 'Sequra Synchronize Order';
    msg += '\n================================================================\n';

    msg = ''.concat(msg, 'sequraStatus : ').concat(orderInformation.sequraStatus);
    msg = ''.concat(msg, '\nsalesforceOrderStatus : ').concat(orderInformation.salesforceOrderStatus);
    msg = ''.concat(msg, '\npaymentStatus : ').concat(orderInformation.paymentStatus);
    msg = ''.concat(msg, '\nshippingStatus : ').concat(orderInformation.shippingStatus);

    return msg;
}

/**
 * synchronizeSequraPayments - Find Orders not paid with sequra checking that sequra status has been approved async.
 */
function synchronizeSequraPayments() {
    logger.debug('synchronizeSequraPayments Process');
    var sequraApi = require('*/cartridge/scripts/sequra/sequraApi');
    var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');

    var orderDateAllowed = new dw.util.Calendar();
    orderDateAllowed.add(dw.util.Calendar.DAY_OF_YEAR, -1);

    var orders = dw.order.OrderMgr.searchOrders(
        '(status = {0} OR status = {1} OR shippingStatus = {2} OR shippingStatus = {3}) AND custom.sequra_TransactionID != {4} AND paymentStatus = {5} AND lastModified >= {6}',
        'creationDate desc',
        Order.ORDER_STATUS_CANCELLED,
        Order.ORDER_STATUS_COMPLETED,
        Order.SHIPPING_STATUS_PARTSHIPPED,
        Order.SHIPPING_STATUS_SHIPPED,
        null,
        Order.PAYMENT_STATUS_PAID,
        orderDateAllowed.getTime()
    );

    var ordersProcessed = 0;

    while (orders.hasNext()) {
        try {
            var order = orders.next();

            var paymentInstrument = sequraHelpers.getSequraPaymentInstrument(order);
            var sequraOrderInformation = order.custom.sequra_orderInformation;
            var sequraProductsInfo = sequraHelpers.getOrderProductInfo(order);
            var itemsShippingStatus = JSON.stringify(Object.assign({}, sequraProductsInfo));

            if (sequraOrderInformation) {
                var orderInformation = JSON.parse(sequraOrderInformation);
                var orderInformationSequraStatus = orderInformation.sequraStatus;
                var orderInformationSalesforceStatus = orderInformation.salesforceOrderStatus;
                var orderInformationPaymentStatus = orderInformation.paymentStatus;
                var orderInformationShippingStatus = orderInformation.shippingStatus;

                var sequraStatus = paymentInstrument.custom.sequra_orderStatus;
                var salesforceOrderStatus = order.status.value;
                var paymentStatus = order.paymentStatus.value;
                var shippingStatus = order.shippingStatus.value;

                if (orderInformationSequraStatus !== sequraStatus || orderInformationSalesforceStatus !== salesforceOrderStatus
                    || orderInformationPaymentStatus !== paymentStatus
                    || orderInformationShippingStatus !== shippingStatus
                    || shippingStatus === dw.order.Order.SHIPPING_STATUS_PARTSHIPPED) {
                    var resultProcess;
                    var sequraStatusUpdated;
                    if (salesforceOrderStatus === dw.order.Order.ORDER_STATUS_CANCELLED) {
                        sequraStatusUpdated = 'cancelled';
                        var data = {
                            action: 'CANCELLED',
                            cancellationReason: 'unspecified'
                        };
                        resultProcess = sequraApi.cancelOrder(order, data);
                    } else {
                        var updateRequired = false;
                        if (salesforceOrderStatus === dw.order.Order.ORDER_STATUS_COMPLETED) {
                            sequraStatusUpdated = 'enviado';
                            updateRequired = true;
                        } else if (order.shippingStatus.value === dw.order.Order.SHIPPING_STATUS_PARTSHIPPED) {
                            sequraStatusUpdated = 'envio parcial';
                            var productInfo = 'items' in orderInformation ? JSON.parse(orderInformation.items) : null;
                            if (productInfo) {
                                // eslint-disable-next-line guard-for-in, no-restricted-syntax
                                for (var index = 0; index < order.getProductLineItems().length && !updateRequired; index += 1) {
                                    var productInfoStored = productInfo[index];
                                    var productFound = false;
                                    for (var i = 0; i < sequraProductsInfo.length && !productFound; i += 1) {
                                        var orderItemInformation = sequraProductsInfo[i];
                                        if (productInfoStored.id === orderItemInformation.id) {
                                            productFound = true;
                                            if (productInfoStored.status !== orderItemInformation.status) {
                                                updateRequired = true;
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (order.shippingStatus.value === dw.order.Order.SHIPPING_STATUS_SHIPPED) {
                            sequraStatusUpdated = 'enviado';
                            updateRequired = true;
                        }
                        if (updateRequired) {
                            resultProcess = sequraApi.updateOrder(order);
                        }
                    }

                    if (!resultProcess) {
                        logger.info('synchronizeSequraPayments partial send order not updated:' + order.getOrderNo());
                    } else if (resultProcess.error) {
                        logger.error('synchronizeSequraPayments error updating order :' + order.getOrderNo() + ' error: ' + resultProcess.message);
                    } else {
                        ordersProcessed += 1;
                        logger.info('synchronizeSequraPayments updated order :' + order.getOrderNo());
                        orderInformation = JSON.stringify({
                            sequraStatus: sequraStatusUpdated,
                            salesforceOrderStatus: salesforceOrderStatus,
                            paymentStatus: paymentStatus,
                            shippingStatus: shippingStatus,
                            items: itemsShippingStatus
                        });
                        // eslint-disable-next-line no-loop-func
                        dw.system.Transaction.wrap(function () {
                            paymentInstrument.custom.sequra_orderStatus = sequraStatusUpdated;
                            order.custom.sequra_orderInformation = orderInformation;
                            order.addNote('Sequra Synchronize Payment', createLogMessage(orderInformation));
                        });
                    }
                }
            }
        } catch (e) {
            logger.error('synchronizeSequraPayments error :' + e.toString());
        }
    }
    orders.close();

    logger.info('Sequra orders to process: ' + orders.count + ' synchronize orders with count {0}', ordersProcessed);
    // eslint-disable-next-line no-undef
    return PIPELET_NEXT;
}

module.exports = {
    synchronizeSequraPayments: synchronizeSequraPayments
};
