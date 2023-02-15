module.exports = {
    root: true,
    extends: 'airbnb-base/legacy',
    rules: {
        'import/no-unresolved': 'off',
        indent: ['error', 4, { SwitchCase: 1, VariableDeclarator: 1 }],
        'func-names': 'off',
        'vars-on-top': 'off',
        'global-require': 'off',
        'no-shadow': ['error', { allow: ['err', 'callback'] }],
        'max-len': 'off'
    },
    globals: {
        dw: true,
        session: true,
        request: true,
        response: true
    }
};
