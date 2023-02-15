// eslint-disable-next-line import/no-unresolved
const processInclude = require('base/util');
const detail = require('./product/detail');
const sequraConfiguration = require('./configuration/sequraConfig');

$(document).ready(() => {
    processInclude(sequraConfiguration);
    processInclude(detail);
});
