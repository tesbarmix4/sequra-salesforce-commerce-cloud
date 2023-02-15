/* global cp, mkdir, target */

require('shelljs/make');

target.compileFonts = function () {
    var fontsDir = 'cartridges/int_sequra_sfra/cartridge/static/default/';
    mkdir('-p', fontsDir);
    cp(
        '-r',
        'cartridges/int_sequra_sfra/cartridge/client/default/fonts/',
        fontsDir
    );
};

target.compileImages = function () {
    var imgesDir = 'cartridges/int_sequra_sfra/cartridge/static/default/';
    mkdir('-p', imgesDir);
    cp(
        '-r',
        'cartridges/int_sequra_sfra/cartridge/client/default/images/',
        imgesDir
    );
};
