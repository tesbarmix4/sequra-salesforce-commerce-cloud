/* eslint-disable no-undef */
Feature('Sequra LoginUser Test');


Scenario('LoginUser Payment Sequra PP3', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentLogin();
    I.sequraSelectPP3Payment();
    I.seguraFillSequraInformationPP3();
    I.sequraFinishPaymentRegistered();
    I.seguraLastStepPP3();
    I.see('Thank you');
});

Scenario('LoginUser Payment Sequra PP5', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentLogin();
    I.sequraSelectPP5Payment();
    I.seguraFillSequraInformationPP5();
    I.sequraFinishPaymentRegistered();
    I.seguraLastStepPP5();
    I.see('Thank you');
});

Scenario('LoginUser Payment Sequra SP1', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentLogin();
    I.sequraSelectSP1Payment();
    I.seguraFillSequraInformationSP1();
    I.sequraFinishPaymentRegistered();
    I.seguraLastStepSP1();
    I.see('Thank you');
});

Scenario('LoginUser Payment Sequra i1', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentLogin();
    I.sequraSelectI1Payment();
    I.seguraFillSequraInformationI1();
    I.sequraFinishPaymentRegisteredWithoutCard();
    I.seguraLastStepI1();
    I.see('Thank you');
});
