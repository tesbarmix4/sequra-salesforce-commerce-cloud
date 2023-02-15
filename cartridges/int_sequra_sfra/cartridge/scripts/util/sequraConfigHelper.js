'use strict';

var sequraHelpers = require('*/cartridge/scripts/sequra/helpers/sequraHelpers');
/**
 * Sequra Configuration Script Helper.
 */
var sequraConfigHelper = {

    sequraPreferences: sequraHelpers.getSequraPreferences(),

    /**
     * Returns widget availability.
     * @returns {boolean} Returns widget availability
     */
    isSequraEnabled: function isSequraEnabled() {
        return (Object.prototype.hasOwnProperty.call(sequraConfigHelper.sequraPreferences, 'sequra_widgetEnabled') && sequraConfigHelper.sequraPreferences.sequra_widgetEnabled);
    },

    /**
     * Sequra widget load url.
     * @returns {string} Sequra widget load url.
     */
    getSequraLoadURL: function getSequraLoadURL() {
        return sequraConfigHelper.sequraPreferences.sequra_widgetURL;
    },

    /**
     * Returns list of products to display in the widgets.
     * @returns {Array} Returns list of products to display in the widgets.
     */
    getSequraProducts: function getSequraProducts() {
        return Object.prototype.hasOwnProperty.call(sequraConfigHelper.sequraPreferences, 'sequraProducts') ? sequraConfigHelper.sequraPreferences.sequraProducts.toString() : '';
    },

    /**
     * Returns merchant Identification.
     * @returns {string} Returns merchant Identification.
     */
    getSequraMerchantID: function getSequraMerchantID() {
        return sequraConfigHelper.sequraPreferences.sequra_merchantID;
    },

    /**
     * Returns Asset Key.
     * @returns {string} Returns Asset Key.
     */
    getSequraAssetKey: function getSequraAssetKey() {
        return sequraConfigHelper.sequraPreferences.sequra_assetKey;
    },

    /**
     * Returns locale used.
     * @returns {string} Returns locale used.
     */
    getSequraLocale: function getSequraLocale() {
        return sequraConfigHelper.sequraPreferences.sequra_locale;
    },

    /**
     * Returns current currency.
     * @returns {string} Returns current currency.
     */
    getSequraCurrency: function getSequraCurrency() {
        return session.getCurrency();
    },

    /**
     * Returns Countries availables.
     * @returns {string} Return Countries availables.
     */
    getCountriesAllowed: function getCountriesAllowed() {
        return sequraConfigHelper.sequraPreferences.countriesAllowed;
    }

};

module.exports = sequraConfigHelper;
