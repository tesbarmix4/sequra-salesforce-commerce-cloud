
function loadSequraWidget() {
    if (typeof Sequra !== 'undefined') {
        // eslint-disable-next-line no-undef
        Sequra.onLoad(() => {
        // eslint-disable-next-line no-undef
            Sequra.refreshComponents();
        });
    }
}

// File extended for use the 'availability' method in ./base file of pagantis cartridge
module.exports = {
    loadSequraWidget,

    renderSequraWidget(amount, quantity, $component) {
        const data = {
            amount,
            quantity,
        };
        $.ajax({
            // eslint-disable-next-line no-undef
            url: window.sequraURLLoad.loadURL,
            type: 'get',
            dataType: 'json',
            data,
            success(response) {
                const $setProducts = $('body').find('.set-item');
                const $widgetComponent = $setProducts.length ? $component.find('.sequra-widget') : $('body').find('.sequra-widget');
                if ($widgetComponent.length) {
                    $widgetComponent.remove();
                }
                const extendwidgetClass = $setProducts.length ? ' col-sm-12' : '';
                const componentClass = `sequra-widget${extendwidgetClass}`;
                $component.append(`<div class="${componentClass}">${response.sequraWidgetTemplate}</div>`);
                loadSequraWidget();
            },
            error() {

            },
        });
    },

};
