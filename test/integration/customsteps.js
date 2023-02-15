/* eslint-disable func-names */
const config = require('./config');

// in this file you can append custom step methods to 'I' object
module.exports = function () {
    // eslint-disable-next-line no-undef
    return actor({
        sequraPaymentInit: function sequraPaymentInit() {
            this.amOnPage(config.Storefront.url);
            this.confirmTrackingConsent();
            this.addProductToCart();
            this.amOnPage(config.Storefront.login);
        },
        sequraProcessPaymentGuest: function sequraProcessPaymentGuest() {
            this.checkoutAsGuest(config.Guest, 'Spain');
            this.checkoutShippingSubmit();
        },
        sequraProcessPaymentLogin: function sequraProcessPaymentLogin() {
            this.checkoutAsLogin(config.Registered);
            this.checkoutShippingSubmit();
        },
        sequraSelectI1Payment: function sequraSelectI1Payment() {
            this.wait(8);
            this.executeScript(() => {
                const component = document.getElementsByClassName('nav-item');
                if (component.length > 2) {
                    document.querySelectorAll('li[data-method-id="i1"]')[0].click();
                } else {
                    document.getElementsByClassName('sequra-tab')[0].click();
                    setTimeout(() => { document.getElementById('sequraPaymentMethod-i1').click(); }, 1500);
                }
            });
            this.wait(2);
            this.submitPayment();
            this.wait(2);
            this.placeOrder();
            this.wait(3);
        },
        sequraSelectSP1Payment: function sequraSelectSP1Payment() {
            this.wait(5);
            this.executeScript(() => {
                const component = document.getElementsByClassName('nav-item');
                if (component.length > 2) {
                    document.querySelectorAll('li[data-method-id="sp1"]')[0].click();
                } else {
                    document.getElementsByClassName('sequra-tab')[0].click();
                    setTimeout(() => { document.getElementById('sequraPaymentMethod-sp1').click(); }, 1500);
                }
            });
            this.wait(2);
            this.submitPayment();
            this.wait(2);
            this.placeOrder();
            this.wait(3);
        },
        sequraSelectPP3Payment: function sequraSelectPP3Payment() {
            this.wait(5);
            this.executeScript(() => {
                const component = document.getElementsByClassName('nav-item');
                if (component.length > 2) {
                    document.querySelectorAll('li[data-method-id="pp3"]')[0].click();
                } else {
                    document.getElementsByClassName('sequra-tab')[0].click();
                    setTimeout(() => { document.getElementById('sequraPaymentMethod-pp3').click(); }, 1500);
                }
            });
            this.wait(2);
            this.submitPayment();
            this.wait(2);
            this.placeOrder();
            this.wait(3);
        },
        sequraSelectPP5Payment: function sequraSelectPP5Payment() {
            this.wait(8);
            this.executeScript(() => {
                const component = document.getElementsByClassName('nav-item');
                if (component.length > 2) {
                    document.querySelectorAll('li[data-method-id="pp5"]')[0].click();
                } else {
                    document.getElementsByClassName('sequra-tab')[0].click();
                    setTimeout(() => { document.getElementById('sequraPaymentMethod-pp5').click(); }, 1500);
                }
            });
            this.wait(4);
            this.submitPayment();
            this.wait(3);
            this.placeOrder();
            this.wait(3);
        },
        seguraFillSequraInformationPP3: function seguraFillSequraInformationPP3() {
            this.switchTo('//iframe[@id="sq-identification-pp3"]');
            this.click('.primary');
        },
        seguraFillSequraInformationSP1: function seguraFillSequraInformationSP1() {
            this.switchTo('//iframe[@id="sq-identification-sp1"]');
            this.click('.primary');
            this.wait(2);
        },
        seguraFillSequraInformationPP5: function seguraFillSequraInformationPP5() {
            this.switchTo('//iframe[@id="sq-identification-pp5"]');
        },
        seguraFillSequraInformationI1: function seguraFillSequraInformationI1() {
            this.switchTo('//iframe[@id="sq-identification-i1"]');
        },

        seguraLastStepPP3: function seguraLastStepPP3() {
            this.switchTo('//iframe[@id="sq-identification-pp3"]');
            this.click('.primary');
            this.wait(10);
        },
        seguraLastStepSP1: function seguraLastStepSP1() {
            this.switchTo('//iframe[@id="sq-identification-sp1"]');
            this.click('.primary');
            this.wait(10);
        },
        seguraLastStepPP5: function seguraLastStepPP5() {
            this.switchTo('//iframe[@id="sq-identification-pp5"]');
            this.click('.primary');
            this.wait(10);
        },
        seguraLastStepI1: function seguraLastStepI1() {
            this.click('.primary');
            this.wait(10);
        },

        sequraFinishPaymentGuest: function sequraFinishPaymentGuest() {
            this.wait(2);
            this.click('//label[@for="sequra_privacy_policy_accepted"]');
            this.fillSequraCustomerInformation(config.Guest);
            this.click('.primary');
            this.fillSequraValidationCode(config.Guest);
            this.sequraFillCard();
        },
        sequraFinishPaymentRegistered: function sequraFinishPaymentRegistered() {
            this.wait(2);
            this.click('//label[@for="sequra_privacy_policy_accepted"]');
            this.fillSequraCustomerInformation(config.Registered);
            this.click('.primary');
            this.fillSequraValidationCode(config.Registered);
            this.sequraFillCard();
            this.switchTo();
            this.wait(3);
        },
        sequraFinishPaymentGuestWithoutCard: function sequraFinishPaymentGuestWithoutCard() {
            this.wait(2);
            this.click('//label[@for="sequra_privacy_policy_accepted"]');
            this.fillSequraCustomerInformation(config.Guest);
            this.click('.primary');
            this.fillSequraValidationCode(config.Guest);
        },
        sequraFinishPaymentRegisteredWithoutCard: function
        sequraFinishPaymentRegisteredWithoutCard() {
            this.wait(2);
            this.click('//label[@for="sequra_privacy_policy_accepted"]');
            this.fillSequraCustomerInformation(config.Registered);
            this.click('.primary');
            this.fillSequraValidationCode(config.Registered);
        },

        sequraFillCard: function sequraFillCard() {
            this.click('.primary');
            this.wait(10);
            this.fillCreditCard(config.Card);
            this.wait(5);
            this.switchTo();
            this.wait(3);
        },

        confirmTrackingConsent: function confirmTrackingConsent() {
            this.click('.affirm');
        },

        addProductToCart() {
            this.click('.home-main-categories .category-tile');
            this.click('.product .image-container a');
            this.click('.color-attribute');
            this.wait(2);
            this.selectOption('#size-1', '10');
            this.click('.add-to-cart');
        },

        checkoutAsGuest: function checkoutAsGuest(Guest, shippingCountry) {
            this.fillField('#email-guest', Guest.guestEmail);
            this.click('.submit-customer');
            this.fillField('#shippingFirstNamedefault', Guest.guestFirstName);
            this.fillField('#shippingLastNamedefault', Guest.guestLastName);
            this.fillField('#shippingAddressOnedefault', Guest.guestStreet);
            this.fillField('#shippingAddressTwodefault', Guest.guestHouseNumber);
            this.selectOption('.shippingCountry', shippingCountry);

            this.selectOption('.shippingState', Guest.guestState);

            this.fillField('#shippingAddressCitydefault', Guest.guestCity);
            this.wait(2);
            this.fillField('#shippingZipCodedefault', Guest.guestPostCode);
            this.wait(1);
            this.fillField('#shippingPhoneNumberdefault', Guest.guestPhoneNumber);
        },

        checkoutAsLogin: function checkoutAsLogin(Registered) {
            this.fillField('#email-guest', Registered.registeredEmail);
            this.click('.js-login-customer');
            this.fillField('#password', Registered.registeredPassword);
            this.click('.submit-customer-login');
        },
        checkoutShippingSubmit: function checkoutShippingSubmit() {
            this.click('.submit-shipping');
            this.wait(2);
        },

        selectBillingAddress: function selectBillingAddress(User) {
            if (User.billingOption) {
                this.selectOption('#billingAddressSelector', User.billignOption);
            }
        },
        submitPayment: function submitPayment() {
            this.click('.submit-payment');
        },
        placeOrder: function placeOrder() {
            this.click('.place-order');
        },
        fillSequraCustomerInformation: function fillSequraCustomerInformation(User) {
            this.fillField('#date_of_birth', User.dOB);
            this.fillField('#nin', User.idCard);
        },
        fillSequraValidationCode: function fillSequraValidationCode(User) {
            this.fillField('#validation_code', User.validationCode);
        },
        fillCreditCard: function fillCreditCard(Card) {
            this.executeScript(() => {
                const component = document.getElementById('mufasa-iframe');
                if (component) {
                    document.getElementById('cc-number').value = Card.number;
                    document.getElementById('cc-exp').value = Card.exp;
                    document.getElementById('cc-csc').value = Card.csc;
                } else {
                    document.getElementsByClassName('card-selector-component')[1].click();
                }
            });
        },
    });
};
