module.exports = {
    extends: 'airbnb-base',
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        jquery: true,
    },
    rules: {
        indent: ['error', 4],
    },
    settings: {
        'import/resolver': {
            node: {
                paths: ['base'],
            },
        },
    },
};
