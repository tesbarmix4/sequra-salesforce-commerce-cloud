/* eslint-disable consistent-return */

'use strict';

/*
 * Script to run Sequra related jobs
 */

/* API Includes */
var logger = require('dw/system/Logger').getLogger('Sequra', 'Sequra');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var Status = require('dw/system/Status');

/**
 * handleSequraHoldPayments - Find Orders not paid with sequra checking that sequra status has been approved async.
 */
function handleSequraHoldPayments() {
    logger.debug('handleSequraHoldPayments Process');
    var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
    var orders = dw.order.OrderMgr.searchOrders(
        'status = {0} AND paymentStatus = {1} AND custom.sequra_TransactionID != {2} AND custom.sequra_TransactionID != {3}',
        'creationDate desc',
        Order.ORDER_STATUS_CREATED,
        Order.PAYMENT_STATUS_NOTPAID,
        null,
        null
    );
    while (orders.hasNext()) {
        try {
            var order = orders.next();
            var paymentInstrument = sequraHelpers.getSequraPaymentInstrument(order);
            if (paymentInstrument && paymentInstrument.custom.sequra_orderStatus === 'approved') {
                var fraudDetectionStatus = { status: 'success' };
                // eslint-disable-next-line no-loop-func
                Transaction.wrap(function () {
                    var placeOrderStatus = OrderMgr.placeOrder(order);
                    if (placeOrderStatus === Status.ERROR) {
                        throw new Error();
                    }

                    if (fraudDetectionStatus.status === 'flag') {
                        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
                    } else {
                        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                    }

                    order.setExportStatus(Order.EXPORT_STATUS_READY);
                    order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);

                    var orderInformation = JSON.stringify({
                        sequraStatus: paymentInstrument.custom.sequra_orderStatus,
                        salesforceOrderStatus: order.status.value,
                        paymentStatus: order.paymentStatus.value,
                        shippingStatus: order.shippingStatus.value
                    });

                    order.custom.sequra_orderInformation = orderInformation;
                });
                logger.debug('handleSequraHoldPayments: Update order to paid :' + order.getOrderNo());
            }
        } catch (e) {
            logger.error('handleSequraHoldPayments error :' + e.toString());
        }
    }
    orders.close();

    logger.info('Sequra handle orders with count {0}', orders.count);
    // eslint-disable-next-line no-undef
    return PIPELET_NEXT;
}

module.exports = {
    handleSequraHoldPayments: handleSequraHoldPayments
};
