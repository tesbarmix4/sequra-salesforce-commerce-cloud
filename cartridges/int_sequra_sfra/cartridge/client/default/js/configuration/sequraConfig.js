/* eslint-disable no-sequences */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-param-reassign */
/* eslint-disable func-names */

module.exports = {
    importSequraConfiguration() {
        const isEnabled = $('#sequraConfig').attr('data-enabled');
        const loadurl = $('#sequraConfig').attr('data-loadurl');
        const listProducts = $('#sequraConfig').attr('data-listproducts');
        const merchant = $('#sequraConfig').attr('data-merchant');
        const assetKey = $('#sequraConfig').attr('data-assetkey');
        const locale = $('#sequraConfig').attr('data-locale');
        const currency = $('#sequraConfig').attr('data-currency');
        const countries = $('#sequraConfig').attr('data-countries');
        const developEnviroment = $('#sequraConfig').attr('data-develop');
        if (isEnabled && isEnabled === 'true') {
            if (typeof window.sequraURLLoad === 'undefined') {
                // eslint-disable-next-line vars-on-top
                window.sequraURLLoad = {
                    loadURL: loadurl,
                };
            }
            window.sequraCountries = countries;
            if (typeof window.sequraConfigParams === 'undefined') {
                if (listProducts) {
                    const sequraProductsArray = listProducts.split(',');
                    if (sequraProductsArray.length > 0) {
                        window.sequraConfigParams = {
                            merchant,
                            assetKey,
                            products: sequraProductsArray,
                            scriptUri: developEnviroment && developEnviroment === 'false' ? 'https://live.sequracdn.com/assets/sequra-checkout.min.js' : 'https://sandbox.sequracdn.com/assets/sequra-checkout.min.js',
                            decimalSeparator: '.',
                            thousandSeparator: '',
                            locale,
                            currency,
                        };

                        (function (i, s, o, g, r, a, m) { i.SequraConfiguration = g; i.SequraOnLoad = []; i[r] = {}; i[r][a] = function (callback) { i.SequraOnLoad.push(callback); }; (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]); a.async = 1; a.src = g.scriptUri; m.parentNode.insertBefore(a, m); }(window, document, 'script', window.sequraConfigParams, 'Sequra', 'onLoad'));
                    }
                }
            }
        }
    },
};
