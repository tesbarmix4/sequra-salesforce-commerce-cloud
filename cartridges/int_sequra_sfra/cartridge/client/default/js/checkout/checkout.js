/* eslint-disable no-var */
/* eslint-disable vars-on-top */
/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
/* eslint-disable import/no-unresolved */
const baseCheckout = require('base/checkout/checkout');
const baseSummaryHelpers = require('base/checkout/summary');
const baseShippingHelpers = require('base/checkout/shipping');
const baseCustomerHelpers = require('base/checkout/customer');
const baseFormHelpers = require('base/checkout/formErrors');
const baseScrollAnimate = require('base/components/scrollAnimate');
const pluginBilling = require('./billing');
const sequraCheckout = require('./sequraCheckout');

/**
 * Create the jQuery Checkout Plugin.
 *
 * This jQuery plugin will be registered on the dom element in checkout.isml with the
 * id of "checkout-main".
 *
 * The checkout plugin will handle the different state the user interface is in as the user
 * progresses through the varying forms such as shipping and payment.
 *
 * Billing info and payment info are used a bit synonymously in this code.
 *
 */
(function ($) {
    $.fn.checkout = function () { // eslint-disable-line
        const plugin = this;

        //
        // Collect form data from user input
        //
        const formData = {
            // Customer Data
            customer: {},

            // Shipping Address
            shipping: {},

            // Billing Address
            billing: {},

            // Payment
            payment: {},

            // Gift Codes
            giftCode: {},
        };

        //
        // The different states/stages of checkout
        //
        const checkoutStages = [
            'customer',
            'shipping',
            'payment',
            'placeOrder',
            'submitted',
        ];

        /**
         * Updates the URL to determine stage
         * @param {number} currentStage - The current stage the user is currently on in the checkout
         */
        function updateUrl(currentStage) {
            window.history.pushState(
                checkoutStages[currentStage],
                document.title,
                `${window.location.pathname
                }?stage=${
                    checkoutStages[currentStage]
                }#${
                    checkoutStages[currentStage]}`,
            );
        }

        //
        // Local member methods of the Checkout plugin
        //
        var members = {

            // initialize the currentStage variable for the first time
            currentStage: 0,

            /**
     * Set or update the checkout stage (AKA the shipping, billing, payment, etc... steps)
     * @returns {Object} a promise
     */
            updateStage() {
                const stage = checkoutStages[members.currentStage];
        var defer = $.Deferred(); // eslint-disable-line

                if (stage === 'customer') {
                    //
                    // Clear Previous Errors
                    //
                    baseCustomerHelpers.methods.clearErrors();
                    //
                    // Submit the Customer Form
                    //
                    const customerFormSelector = baseCustomerHelpers.methods.isGuestFormActive()
                        ? baseCustomerHelpers.vars.GUEST_FORM
                        : baseCustomerHelpers.vars.REGISTERED_FORM;
                    const customerForm = $(customerFormSelector);
                    $.ajax({
                        url: customerForm.attr('action'),
                        type: 'post',
                        data: customerForm.serialize(),
                        success(data) {
                            if (data.redirectUrl) {
                                window.location.href = data.redirectUrl;
                            } else {
                                baseCustomerHelpers.methods.customerFormResponse(defer, data);
                                const sequraComponent = $('#sequraTabsActive');
                                if (sequraComponent.length) {
                                    sequraCheckout.manageSequraPaymentMethodsView();
                                }
                            }
                        },
                        error(err) {
                            if (err.responseJSON && err.responseJSON.redirectUrl) {
                                window.location.href = err.responseJSON.redirectUrl;
                            }
                            // Server error submitting form
                            defer.reject(err.responseJSON);
                        },
                    });
                    return defer;
                } if (stage === 'shipping') {
                    //
                    // Clear Previous Errors
                    //
                    baseFormHelpers.clearPreviousErrors('.shipping-form');

                    //
                    // Submit the Shipping Address Form
                    //
                    const isMultiShip = $('#checkout-main').hasClass('multi-ship');
                    const formSelector = isMultiShip
                        ? '.multi-shipping .active form' : '.single-shipping .shipping-form';
                    const form = $(formSelector);

                    if (isMultiShip && form.length === 0) {
                        // disable the next:Payment button here
                        $('body').trigger('checkout:disableButton', '.next-step-button button');
                        // in case the multi ship form is already submitted
                        const url = $('#checkout-main').attr('data-checkout-get-url');
                        $.ajax({
                            url,
                            method: 'GET',
                            success(data) {
                                // enable the next:Payment button here
                                $('body').trigger('checkout:enableButton', '.next-step-button button');
                                if (!data.error) {
                                    $('body').trigger('checkout:updateCheckoutView',
                                        { order: data.order, customer: data.customer });
                                    defer.resolve();
                                } else if (data.message && $('.shipping-error .alert-danger').length < 1) {
                                    const errorMsg = data.message;
                                    const errorHtml = `${'<div class="alert alert-danger alert-dismissible valid-cart-error '
                                + 'fade show" role="alert">'
                                + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                                + '<span aria-hidden="true">&times;</span>'
                                + '</button>'}${errorMsg}</div>`;
                                    $('.shipping-error').append(errorHtml);
                                    baseScrollAnimate($('.shipping-error'));
                                    defer.reject();
                                } else if (data.redirectUrl) {
                                    window.location.href = data.redirectUrl;
                                }
                            },
                            error() {
                                // enable the next:Payment button here
                                $('body').trigger('checkout:enableButton', '.next-step-button button');
                                // Server error submitting form
                                defer.reject();
                            },
                        });
                    } else {
                        let shippingFormData = form.serialize();

                        $('body').trigger('checkout:serializeShipping', {
                            form,
                            data: shippingFormData,
                            callback(data) {
                                shippingFormData = data;
                            },
                        });
                        // disable the next:Payment button here
                        $('body').trigger('checkout:disableButton', '.next-step-button button');
                        $.ajax({
                            url: form.attr('action'),
                            type: 'post',
                            data: shippingFormData,
                            success(data) {
                                // enable the next:Payment button here
                                $('body').trigger('checkout:enableButton', '.next-step-button button');
                                baseShippingHelpers.methods.shippingFormResponse(defer, data);
                            },
                            error(err) {
                                // enable the next:Payment button here
                                $('body').trigger('checkout:enableButton', '.next-step-button button');
                                if (err.responseJSON && err.responseJSON.redirectUrl) {
                                    window.location.href = err.responseJSON.redirectUrl;
                                }
                                // Server error submitting form
                                defer.reject(err.responseJSON);
                            },
                        });
                    }
                    return defer;
                } if (stage === 'payment') {
                    //
                    // Submit the Billing Address Form
                    //

                    baseFormHelpers.clearPreviousErrors('.payment-form');

                    let billingAddressForm = $('#dwfrm_billing .billing-address-block :input').serialize();

                    $('body').trigger('checkout:serializeBilling', {
                        form: $('#dwfrm_billing .billing-address-block'),
                        data: billingAddressForm,
                        callback(data) {
                            if (data) {
                                billingAddressForm = data;
                            }
                        },
                    });

                    let contactInfoForm = $('#dwfrm_billing .contact-info-block :input').serialize();

                    $('body').trigger('checkout:serializeBilling', {
                        form: $('#dwfrm_billing .contact-info-block'),
                        data: contactInfoForm,
                        callback(data) {
                            if (data) {
                                contactInfoForm = data;
                            }
                        },
                    });

                    const activeTabId = $('.tab-pane.active').attr('id');
                    const paymentInfoSelector = `#dwfrm_billing .${activeTabId} .payment-form-fields :input`;
                    let paymentInfoForm = $(paymentInfoSelector).serialize();

                    $('body').trigger('checkout:serializeBilling', {
                        form: $(paymentInfoSelector),
                        data: paymentInfoForm,
                        callback(data) {
                            if (data) {
                                paymentInfoForm = data;
                            }
                        },
                    });

                    let paymentForm = `${billingAddressForm}&${contactInfoForm}&${paymentInfoForm}`;

                    if ($('.data-checkout-stage').data('customer-type') === 'registered') {
                        // if payment method is credit card
                        if ($('.payment-information').data('payment-method-id') === 'CREDIT_CARD') {
                            if (!($('.payment-information').data('is-new-payment'))) {
                                const cvvCode = $('.saved-payment-instrument.'
                            + 'selected-payment .saved-payment-security-code').val();

                                if (cvvCode === '') {
                                    const cvvElement = $('.saved-payment-instrument.'
                                + 'selected-payment '
                                + '.form-control');
                                    cvvElement.addClass('is-invalid');
                                    baseScrollAnimate(cvvElement);
                                    defer.reject();
                                    return defer;
                                }

                                const $savedPaymentInstrument = $('.saved-payment-instrument'
                            + '.selected-payment');

                                paymentForm += `&storedPaymentUUID=${
                                    $savedPaymentInstrument.data('uuid')}`;

                                paymentForm += `&securityCode=${cvvCode}`;
                            }
                        }
                    }
                    // disable the next:Place Order button here
                    $('body').trigger('checkout:disableButton', '.next-step-button button');

                    $.ajax({
                        url: $('#dwfrm_billing').attr('action'),
                        method: 'POST',
                        data: paymentForm,
                        success(data) {
                            // enable the next:Place Order button here
                            $('body').trigger('checkout:enableButton', '.next-step-button button');
                            // look for field validation errors
                            if (data.error) {
                                if (data.fieldErrors.length) {
                                    data.fieldErrors.forEach((error) => {
                                        if (Object.keys(error).length) {
                                            baseFormHelpers.loadFormErrors('.payment-form', error);
                                        }
                                    });
                                }

                                if (data.serverErrors.length) {
                                    data.serverErrors.forEach((error) => {
                                        $('.error-message').show();
                                        $('.error-message-text').text(error);
                                        baseScrollAnimate($('.error-message'));
                                    });
                                }

                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                }

                                defer.reject();
                            } else {
                                //
                                // Populate the Address Summary
                                //
                                $('body').trigger('checkout:updateCheckoutView',
                                    { order: data.order, customer: data.customer });

                                if (data.renderedPaymentInstruments) {
                                    $('.stored-payments').empty().html(
                                        data.renderedPaymentInstruments,
                                    );
                                }

                                if (data.customer.registeredUser
                            && data.customer.customerPaymentInstruments.length
                                ) {
                                    $('.cancel-new-payment').removeClass('checkout-hidden');
                                }

                                baseScrollAnimate();
                                defer.resolve(data);
                            }
                        },
                        error(err) {
                            // enable the next:Place Order button here
                            $('body').trigger('checkout:enableButton', '.next-step-button button');
                            if (err.responseJSON && err.responseJSON.redirectUrl) {
                                window.location.href = err.responseJSON.redirectUrl;
                            }
                        },
                    });

                    return defer;
                } if (stage === 'placeOrder') {
                    // disable the placeOrder button here
                    $('body').trigger('checkout:disableButton', '.next-step-button button');
                    $.ajax({
                        url: $('.place-order').data('action'),
                        method: 'POST',
                        success(data) {
                            // enable the placeOrder button here
                            $('body').trigger('checkout:enableButton', '.next-step-button button');
                            if (data.error) {
                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                    defer.reject();
                                } else {
                                    // go to appropriate stage and display error message
                                    defer.reject(data);
                                }
                            } else {
                                if (data.continueUrl) {
                                    const redirect = $('<form>')
                                        .appendTo(document.body)
                                        .attr({
                                            method: 'POST',
                                            action: data.continueUrl,
                                        });

                                    $('<input>')
                                        .appendTo(redirect)
                                        .attr({
                                            name: 'orderID',
                                            value: data.orderID,
                                        });

                                    $('<input>')
                                        .appendTo(redirect)
                                        .attr({
                                            name: 'orderToken',
                                            value: data.orderToken,
                                        });

                                    redirect.submit();
                                } else if (data.IframeHtml) {
                                    $('body').attr('data-sequra-id', data.sequraTransactionID);
                                    sequraCheckout.loadSequraPayment(data);
                                }
                                defer.resolve(data);
                            }
                        },
                        error() {
                            // enable the placeOrder button here
                            $('body').trigger('checkout:enableButton', $('.next-step-button button'));
                        },
                    });

                    return defer;
                }
        var p = $('<div>').promise(); // eslint-disable-line
                setTimeout(() => {
            p.done(); // eslint-disable-line
                }, 500);
        return p; // eslint-disable-line
            },

            /**
     * Initialize the checkout stage.
     *
     * TODO: update this to allow stage to be set from server?
     */
            initialize() {
                // set the initial state of checkout
                members.currentStage = checkoutStages
                    .indexOf($('.data-checkout-stage').data('checkout-stage'));
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);

                $('body').on('click', '.submit-customer-login', (e) => {
                    e.preventDefault();
                    members.nextStage();
                });

                $('body').on('click', '.submit-customer', (e) => {
                    e.preventDefault();
                    members.nextStage();
                });

                //
                // Handle Payment option selection
                //
                $('input[name$="paymentMethod"]', plugin).on('change', function () {
                    $('.credit-card-form').toggle($(this).val() === 'CREDIT_CARD');
                });

                //
                // Handle Next State button click
                //
                $(plugin).on('click', '.next-step-button button', () => {
                    members.nextStage();
                });

                //
                // Handle Edit buttons on shipping and payment summary cards
                //
                $('.customer-summary .edit-button', plugin).on('click', () => {
                    members.gotoStage('customer');
                });

                $('.shipping-summary .edit-button', plugin).on('click', () => {
                    if (!$('#checkout-main').hasClass('multi-ship')) {
                        $('body').trigger('shipping:selectSingleShipping');
                    }

                    members.gotoStage('shipping');
                });

                $('.payment-summary .edit-button', plugin).on('click', () => {
                    members.gotoStage('payment');
                });

                //
                // remember stage (e.g. shipping)
                //
                updateUrl(members.currentStage);

                //
                // Listen for foward/back button press and move to correct checkout-stage
                //
                $(window).on('popstate', (e) => {
                    //
                    // Back button when event state less than current state in ordered
                    // checkoutStages array.
                    //
                    if (e.state === null
                || checkoutStages.indexOf(e.state) < members.currentStage) {
                        members.handlePrevStage(false);
                    } else if (checkoutStages.indexOf(e.state) > members.currentStage) {
                        // Forward button  pressed
                        members.handleNextStage(false);
                    }
                });

                //
                // Set the form data
                //
                plugin.data('formData', formData);
            },

            /**
     * The next checkout state step updates the css for showing correct buttons etc...
     */
            nextStage() {
                const promise = members.updateStage();

                promise.done(() => {
                    // Update UI with new stage
                    $('.error-message').hide();
                    members.handleNextStage(true);
                });

                promise.fail((data) => {
                    // show errors
                    if (data) {
                        if (data.errorStage) {
                            members.gotoStage(data.errorStage.stage);

                            if (data.errorStage.step === 'billingAddress') {
                                const $billingAddressSameAsShipping = $(
                                    'input[name$="_shippingAddressUseAsBillingAddress"]',
                                );
                                if ($billingAddressSameAsShipping.is(':checked')) {
                                    $billingAddressSameAsShipping.prop('checked', false);
                                }
                            }
                        }

                        if (data.errorMessage) {
                            $('.error-message').show();
                            $('.error-message-text').text(data.errorMessage);
                        }
                    }
                });
            },

            /**
     * The next checkout state step updates the css for showing correct buttons etc...
     *
     * @param {boolean} bPushState - boolean when true pushes state using the history api.
     */
            handleNextStage(bPushState) {
                if (members.currentStage < checkoutStages.length - 1) {
                    // move stage forward
                    members.currentStage += 1;

                    //
                    // show new stage in url (e.g.payment)
                    //
                    if (bPushState) {
                        updateUrl(members.currentStage);
                    }
                }

                // Set the next stage on the DOM
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            },

            /**
     * Previous State
     */
            handlePrevStage() {
                if (members.currentStage > 0) {
                    // move state back
                    members.currentStage -= 1;
                    updateUrl(members.currentStage);
                }

                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);

                if ($('[id^="sq-identification-"]').length) {
                    sequraCheckout.cancelSequraOrder();
                }
            },

            /**
     * Use window history to go to a checkout stage
     * @param {string} stageName - the checkout state to goto
     */
            gotoStage(stageName) {
                members.currentStage = checkoutStages.indexOf(stageName);
                updateUrl(members.currentStage);
                $(plugin).attr('data-checkout-stage', checkoutStages[members.currentStage]);
            },
        };

        //
        // Initialize the checkout
        //
        members.initialize();

        return this;
    };
}(jQuery));

baseCheckout.updateCheckoutView = function () {
    $('body').on('checkout:updateCheckoutView', (e, data) => {
        if (data.csrfToken) {
            $("input[name*='csrf_token']").val(data.csrfToken);
        }
        baseCustomerHelpers.methods.updateCustomerInformation(data.customer, data.order);
        baseShippingHelpers.methods.updateMultiShipInformation(data.order);
        baseSummaryHelpers.updateTotals(data.order.totals);
        data.order.shipping.forEach((shipping) => {
            baseShippingHelpers.methods.updateShippingInformation(
                shipping,
                data.order,
                data.customer,
                data.options,
            );
        });
        pluginBilling.methods.updateBillingInformation(
            data.order,
            data.customer,
            data.options,
        );
        pluginBilling.methods.updatePaymentInformation(data.order, data.options);
        baseSummaryHelpers.updateOrderProductSummaryInformation(data.order, data.options);
    });
};

[baseShippingHelpers, pluginBilling].forEach((library) => {
    Object.keys(library).forEach((key) => {
        if (typeof library[key] === 'object') {
            baseCheckout[key] = $.extend({}, baseCheckout[key], library[key]);
        } else {
            baseCheckout[key] = library[key];
        }
    });
});

module.exports = baseCheckout;
