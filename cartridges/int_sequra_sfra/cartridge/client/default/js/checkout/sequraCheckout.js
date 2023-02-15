
const sequraWidget = require('../product/sequraWidget');

const paymentsMethods = {
    sequra: 'SEQURA',
    i1: 'i1',
    pp3: 'pp3',
    sp1: 'sp1',
    pp5: 'pp5',
};

/**
 * Function to parse Sequra Iframe
 * @param {*} iframe - Iframe to Parse
 * @returns
 */
function htmlDecode(iframe) {
    const e = document.createElement('div');
    e.innerHTML = iframe;
    return e.childNodes[0].nodeValue;
}


module.exports = {

    /**
     * Load Sequra Payment Methods
     * @returns defer
     */
    loadSequraMethods() {
        const defer = $.Deferred();
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const stage = urlParams.get('stage');
        const sequraComponent = $('#sequraTabsActive');
        if (sequraComponent.length && stage !== 'customer' && stage !== null) {
            const data = {
                ordervalue: $('#sequraPaymentValue').attr('data-widgetvalue'),
                template: 'separated',
            };
            $.ajax({
                url: 'Sequra-Payments',
                type: 'post',
                dataType: 'json',
                data,
                success(response) {
                    if (!response.error && sequraComponent.length) {
                        const $errorBlock = $('.error');
                        if ($errorBlock.length > 0) {
                            $errorBlock.html('');
                        }
                        sequraComponent.parent().append(response.sequraPaymentOptionsTemplate);
                        const billingComponent = $('.billing-address-block');
                        if (!billingComponent.hasClass('d-none')) {
                            billingComponent.addClass('d-none');
                        }
                        $('input[id^=sequraPaymentMethod-]').on('click', (event) => {
                            $('.sequraInfo').addClass('d-none');
                            const paymentType = $(event.currentTarget).val();
                            const infoComponent = $(event.currentTarget).closest(`.${paymentType}`).find('.sequraInfo');
                            infoComponent.removeClass('d-none');
                            $('body').trigger('checkout:enableButton', '.submit-payment');
                        });
                    }
                    defer.resolve(response);
                },
            });
        } else {
            defer.resolve();
        }

        return defer;
    },
    manageSequraPaymentMethodsView() {
        setTimeout(() => {
            const promise = this.loadSequraMethods();

            promise.done(() => {
            // eslint-disable-next-line func-names
                $('.payment-options .nav-item').on('click', function (e) {
                    const methodID = $(this).data('method-id');
                    e.preventDefault();
                    $('.tab-pane').removeClass('active');
                    $('body').find('.sequraInfo').addClass('d-none');
                    $('input[id^=sequraPaymentMethod-]').prop('checked', false);
                    if (methodID === paymentsMethods.sequra) {
                        $('body').trigger('checkout:disableButton', '.submit-payment');
                        if (!$('#i1-content').length && !$('#sp1-content').length && !$('#pp3-content').length && !$('#pp5-content').length) {
                            const data = {
                                ordervalue: $('.sequra-tab').attr('data-widgetvalue'),
                            };
                            $.ajax({
                                url: 'Sequra-Payments',
                                type: 'post',
                                dataType: 'json',
                                data,
                                success(response) {
                                    const $sequraContent = $('.sequra-content .payment-form-fields');
                                    if (response.error) {
                                        $sequraContent.html('');
                                        $sequraContent.append(`<div><p>${response.serverErrorMessage}</p></div>`);
                                    } else if ($sequraContent.length) {
                                        $sequraContent
                                            .append(response.sequraPaymentOptionsTemplate);
                                        sequraWidget.loadSequraWidget();
                                        $('input[id^=sequraPaymentMethod-]').on('click', (event) => {
                                            $('.sequraInfo').addClass('d-none');
                                            const paymentType = $(event.currentTarget).val();
                                            const infoComponent = $(event.currentTarget).closest(`.${paymentType}`).find('.sequraInfo');
                                            infoComponent.removeClass('d-none');
                                            $('body').trigger('checkout:enableButton', '.submit-payment');
                                        });
                                    }
                                },
                            });
                        }
                    } else if (methodID === paymentsMethods.i1 || methodID === paymentsMethods.pp3
                        || methodID === paymentsMethods.sp1 || methodID === paymentsMethods.pp5) {
                        $('.sequraMethodsContent').html('');
                        const paymentComponent = $('.payment-form .tab-pane[data-method-id=SEQURA]');
                        const sequraPayment = paymentComponent.find('.payment-form-fields');
                        const sequraPaymentInfo = sequraPayment.find('.sequraMethodsContent');
                        paymentComponent.addClass('active');
                        const sequraPaymentSelectedComponents = $(`.paymentContent-${methodID}`);
                        sequraPayment.find('input').removeAttr('disabled');
                        sequraPaymentInfo.append(sequraPaymentSelectedComponents.html());
                        const infoPayment = sequraPaymentInfo.find('.sequraInfo');
                        if (infoPayment) {
                            infoPayment.removeClass('d-none');
                        }
                        sequraWidget.loadSequraWidget();
                    } else {
                        $('body').trigger('checkout:enableButton', '.submit-payment');
                        const paymentComponent = $('#credit-card-content');
                        paymentComponent.addClass('active');
                    }
                });
            });
        }, 500);
    },

    loadSequraPayment(data) {
        const htmlDec = htmlDecode(data.IframeHtml);
        const content = `<div class="sequra-checkout">${htmlDec}</div>`;
        $('#maincontent').append(content);
        if ($('.sequra-checkout').length) {
            setTimeout(() => {
                // eslint-disable-next-line func-names
                const sequraCallbackFunction = function () {
                    $.ajax({
                        url: 'Sequra-AbortOrder',
                        method: 'POST',
                        data: {
                            orderID: data.orderID,
                            orderToken: data.orderToken,
                        },
                        success(response) {
                            $('body').attr('data-sequra-id', '');
                            $('.sequra-checkout').remove();
                            window.SequraFormInstance = null;
                            if (response.urlRedirect) {
                                window.location.href = response
                                    .urlRedirect;
                            }
                        },
                        error(response) {
                            $('body').attr('data-sequra-id', '');
                            $('.sequra-checkout').remove();
                            window.SequraFormInstance = null;
                            if (response.urlRedirect) {
                                window.location.href = response
                                    .urlRedirect;
                            }
                        },
                    });
                };
                window.SequraFormInstance
                    .setCloseCallback(sequraCallbackFunction);
                window.SequraFormInstance.show();
            }, 500);
        }
    },

    cancelSequraOrder() {
        $.ajax({
            url: 'Sequra-AbortSequraOrderByReference',
            method: 'POST',
            data: {
                sequraOrderID: $('body').attr('data-sequra-id'),
            },
            success(response) {
                $('body').attr('data-sequra-id', '');
                $('.sequra-checkout').remove();
                window.SequraFormInstance = null;
                if (response.urlRedirect) {
                    window.location.href = response
                        .urlRedirect;
                }
            },
            error(response) {
                $('body').attr('data-sequra-id', '');
                $('.sequra-checkout').remove();
                window.SequraFormInstance = null;
                if (response.urlRedirect) {
                    window.location.href = response
                        .urlRedirect;
                }
            },
        });
    },
};
