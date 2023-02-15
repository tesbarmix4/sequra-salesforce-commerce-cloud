/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */

const path = require('path');
const ExtractTextPlugin = require('sgmf-scripts')['extract-text-webpack-plugin'];
const sgmfScripts = require('sgmf-scripts');
const webpack = require('webpack');
const StyleLintPlugin = require('stylelint-webpack-plugin');

const cartridgeFolderName = 'int_sequra_sfra';
const CleanWebpackPlugin = require('clean-webpack-plugin');

const bootstrapFunctionality = {
    Alert: 'exports-loader?Alert!bootstrap/js/src/alert',
    Carousel: 'exports-loader?Carousel!bootstrap/js/src/carousel',
    Collapse: 'exports-loader?Collapse!bootstrap/js/src/collapse',
    Modal: 'exports-loader?Modal!bootstrap/js/src/modal',
    Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/src/scrollspy',
    Tab: 'exports-loader?Tab!bootstrap/js/src/tab',
    Util: 'exports-loader?Util!bootstrap/js/src/util',
    Select: 'exports-loader?Util!bootstrap-select/js/dist/select',
    /** Remove these comments if u wanna any of these bootstrap funcitonalities */
    // Dropdown: 'exports-loader?Dropdown!bootstrap/js/src/dropdown',
    // Popover: 'exports-loader?Popover!bootstrap/js/src/popover',
    // Tooltip: 'exports-loader?Tooltip!bootstrap/js/src/tooltip',
    // Button: 'exports-loader?Button!bootstrap/js/src/button',
};

module.exports = [
    {
        mode: process.env.NODE_ENV,
        devtool: process.env.NODE_ENV === 'production' ? 'none' : 'source-maps',
        name: 'js',
        entry: sgmfScripts.createJsPath(),
        output: {
            path: path.resolve(`./cartridges/${cartridgeFolderName}/cartridge/static`),
            filename: '[name].js',
        },
        plugins: [
            new CleanWebpackPlugin(
                [
                    './cartridges/int_sequra_sfra/cartridge/static/default/js',
                ],
                {
                    verbose: true,
                    dry: false,
                    root: path.join(__dirname, ''),
                    beforeEmit: false,
                },
            ),
            new webpack.ProvidePlugin(bootstrapFunctionality),
        ],
        resolve: {
            alias: {
                jquery: path.resolve(
                    __dirname,
                    '../storefront-reference-architecture/node_modules/jquery',
                ),
                bootstrap: path.resolve(__dirname, '../link_sequra/node_modules/bootstrap'),
                lodash: path.resolve(
                    __dirname,
                    '../storefront-reference-architecture/node_modules/lodash',
                ),
            },
        },
        module: {
            rules: [
                {
                    test: /\.js?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/env',
                                    {
                                        targets: {
                                            node: '8.10',
                                        },
                                    },
                                ],
                            ],
                            plugins: [
                                [
                                    '@babel/plugin-proposal-object-rest-spread',
                                    { loose: true, useBuiltIns: true },
                                ],
                            ],
                            cacheDirectory: true,
                            sourceType: 'unambiguous',
                        },
                    },
                },
                {
                    test: /bootstrap(.)*\.js$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/env'],
                            plugins: ['@babel/plugin-proposal-object-rest-spread'],
                            cacheDirectory: true,
                        },
                    },
                },
            ],
        },
    },
    {
        mode: 'none',
        name: 'scss',
        entry: sgmfScripts.createScssPath(),
        devtool: 'source-map',
        output: {
            path: path.resolve(`./cartridges/${cartridgeFolderName}/cartridge/static`),
            filename: '[name].css',
        },
        module: {
            unknownContextCritical: false,
            rules: [
                {
                    test: /\.scss$/,
                    use: ExtractTextPlugin.extract({
                        use: [
                            {
                                loader: 'css-loader',
                                options: {
                                    url: false,
                                    sourceMap: true,
                                },
                            },
                            'postcss-loader',
                            {
                                loader: 'postcss-loader',
                                options: {
                                    plugins: [require('autoprefixer')()],
                                },
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    includePaths: [
                                        path.resolve(
                                            process.cwd(),
                                            '../storefront-reference-architecture/node_modules/',
                                        ),
                                        path.resolve(
                                            process.cwd(), // eslint-disable-next-line max-len
                                            '../storefront-reference-architecture/node_modules/flag-icon-css/sass',
                                        ),
                                    ],
                                    sourceMap: true,
                                },
                            },
                        ],
                    }),
                },
            ],
        },
        plugins: [
            new ExtractTextPlugin({
                filename: '[name].css',
            }),
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
            }),
            new StyleLintPlugin({
                configFile: `./cartridges/${cartridgeFolderName}/cartridge/client/default/scss/.stylelintrc.json`,
                failOnError: true,
            }),
        ],
        externals: {
            base: '../storefront-reference-architecture/cartridges/app_storefront_base/',
            jquery: 'jQuery',
        },
    },
];
