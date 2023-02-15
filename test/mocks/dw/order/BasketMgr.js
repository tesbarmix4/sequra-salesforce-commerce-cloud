// eslint-disable-next-line import/no-unresolved
const ArrayList = require('../../../mocks/dw.util.Collection');

function getCurrentBasket() {
    return {
        UUID: 'baskettest',
        customer: {
            authenticated: true,
            profile: {
                firstName: 'user',
                lastName: 'user',
                birthday: '01/01/1980',
            },
            customerEmail: 'test@onestic.com',
        },
        customerNo: '0000001',
        billingAddress: {
            firstName: 'Test',
            lastName: 'Test Test',
            address1: 'Direccion Test',
            address2: 'Direccion Test 2',
            city: 'Valencia',
            postalCode: '46000',
            countryCode: {
                value: 'ES',
            },
            phone: '666666666',
            stateCode: 'Valencia',
        },
        defaultShipment: {
            shippingMethod: {
                name: 'Shipping_Method',
            },
            shippingAddress: {
                firstName: 'Test',
                lastName: 'Test Test',
                address1: 'Direccion Test',
                address2: 'Direccion Test 2',
                city: 'Valencia',
                postalCode: '46000',
                countryCode: {
                    value: 'ES',
                },
                phone: '666666666',
                stateCode: 'Valencia',
                setFirstName: function setFirstName(firstNameInput) {
                    this.firstName = firstNameInput;
                },
                setLastName: function setLastName(lastNameInput) {
                    this.lastName = lastNameInput;
                },
                setAddress1: function setAddress1(address1Input) {
                    this.address1 = address1Input;
                },
                setAddress2: function setAddress2(address2Input) {
                    this.address2 = address2Input;
                },
                setCity: function setCity(cityInput) {
                    this.city = cityInput;
                },
                setPostalCode: function setPostalCode(postalCodeInput) {
                    this.postalCode = postalCodeInput;
                },
                setStateCode: function setStateCode(stateCodeInput) {
                    this.stateCode = stateCodeInput;
                },
                setCountryCode: function setCountryCode(countryCodeInput) {
                    this.countryCode.value = countryCodeInput;
                },
                setPhone: function setPhone(phoneInput) {
                    this.phone = phoneInput;
                },
            },
        },
        totalGrossPrice: {
            value: 250.0,
        },
        currency: 'EUR',
        paymentInstruments: {},
        getAllLineItems() {
            return new ArrayList([]);
        },
    };
}

module.exports = {
    getCurrentBasket,
};
