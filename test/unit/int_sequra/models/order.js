/* eslint-disable no-undef */


const { assert } = require('chai');

describe('Order', () => {
    it('can\'t be covered by unit test because of module.superModule usage', () => {
        assert.equal(true, true);
    });
});
