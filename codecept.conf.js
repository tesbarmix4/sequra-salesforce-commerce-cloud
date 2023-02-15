exports.config = {
    tests: './test/integration/tests/*_test.js',
    output: './test/integration/output',
    helpers: {
        WebDriver: {
            url: '',
            browser: 'chrome',
            desiredCapabilities: {
                chromeOptions: {
                    args: ['--headless', '--disable-gpu', '--no-sandbox'],
                    // args: ['--disable-gpu', '--no-sandbox', 'start-fullscreen'],
                },
            },
        },
    },
    include: {
        I: './test/integration/customsteps.js',
    },
    bootstrap: null,
    mocha: {},
    name: 'SequraTest',
    plugins: {
        pauseOnFail: {}, retryFailedStep: { enabled: true }, screenshotOnFail: { enabled: true }, wdio: { enabled: true, services: ['selenium-standalone'] },
    },
    wdio: { enabled: true, services: ['selenium-standalone'] },
};
