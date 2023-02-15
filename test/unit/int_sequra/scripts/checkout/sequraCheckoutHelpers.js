/* eslint-disable no-undef */


// eslint-disable-next-line import/no-extraneous-dependencies
const { assert } = require('chai');

const sequraHelpers = require('../../../../mocks/helpers/sequraCheckoutHelpers');

describe('sequraCheckoutHelpers', () => {
    describe('validateSequraPayment', () => {
        it('should return an invalid payment', () => {
            const req = {
                geolocation: {
                    countryCode: 'ES',
                },
                currentCustomer: {
                    raw: {},
                },
            };

            // eslint-disable-next-line global-require
            const basketMgr = require('../../../../mocks/dw/order/BasketMgr');

            const currentBasket = basketMgr.getCurrentBasket();
            const result = sequraHelpers.validateSequraPayment(req, currentBasket);
            assert.isTrue(result.error);
        });
    });
});
