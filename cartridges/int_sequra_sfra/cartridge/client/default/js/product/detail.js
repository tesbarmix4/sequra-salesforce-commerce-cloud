// eslint-disable-next-line import/no-unresolved
const detailBase = require('base/product/detail');
const sequraWidget = require('./sequraWidget');

function updateAttribute() {
    $('body').on('product:afterAttributeSelect', (e, response) => {
        if ($('.product-detail>.bundle-items').length) {
            response.container.data('pid', response.data.product.id);
            response.container.find('.product-id').text(response.data.product.id);
        } else if ($('.product-set-detail').eq(0)) {
            response.container.data('pid', response.data.product.id);
            response.container.find('.product-id').text(response.data.product.id);
        } else {
            $('.product-id').text(response.data.product.id);
            $('.product-detail:not(".bundle-item")').data('pid', response.data.product.id);
        }
        this.renderSequraWidget();
    });
}

// File to extend 'updateAttributesAndDetails' calling sequraWidget
module.exports = {
    availability: detailBase.availability,

    addToCart: detailBase.addToCart,

    updateAttributesAndDetails: detailBase.updateAttributesAndDetails,

    showSpinner: detailBase.showSpinner,
    updateAttribute,
    updateAddToCart: detailBase.updateAddToCart,
    updateAvailability: detailBase.updateAvailability,
    sizeChart: detailBase.sizeChart,
    copyProductLink: detailBase.copyProductLink,

    focusChooseBonusProductModal: detailBase.focusChooseBonusProductModal,

    renderSequraWidget() {
        // eslint-disable-next-line no-undef
        if (typeof window.sequraURLLoad !== 'undefined') {
            const $setProducts = $('body').find('.set-item');
            if (!$setProducts.length) {
                const $component = $('.product-detail');
                const price = $component.find('.prices .sales .value').attr('content');
                const quantitySelector = $component.find('.quantity-select option:selected');
                const quantity = quantitySelector.val();
                sequraWidget.renderSequraWidget(price, quantity, $('.prices-add-to-cart-actions'));
            } else {
                let totalPrice = 0;
                // eslint-disable-next-line no-unused-vars
                $setProducts.each((_index, component) => {
                    const price = $(component).find('.prices .sales .value').attr('content');
                    const quantitySelector = $(component).find('.quantity-select option:selected');
                    const quantity = quantitySelector.val();
                    totalPrice += (quantity * price);
                    const inputWidget = $(component).find('.row.cart-and-ipay');
                    sequraWidget.renderSequraWidget(price, quantity, inputWidget);
                });
                const quantity = 1;
                sequraWidget.renderSequraWidget(totalPrice, quantity, $('.prices-add-to-cart-actions'));
            }
        }
    },
};
