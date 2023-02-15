/* eslint-disable no-undef */
Feature('Sequra Guest Test');


Scenario('Guest Payment Sequra PP3', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentGuest();
    I.sequraSelectPP3Payment();
    I.seguraFillSequraInformationPP3();
    I.sequraFinishPaymentGuest();
    I.seguraLastStepPP3();
    I.see('Thank you');
});

Scenario('Guest Payment Sequra PP5', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentGuest();
    I.sequraSelectPP5Payment();
    I.seguraFillSequraInformationPP5();
    I.sequraFinishPaymentGuest();
    I.seguraLastStepPP5();
    I.see('Thank you');
});

Scenario('Guest Payment Sequra SP1', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentGuest();
    I.sequraSelectSP1Payment();
    I.seguraFillSequraInformationSP1();
    I.sequraFinishPaymentGuest();
    I.seguraLastStepSP1();
    I.see('Thank you');
});

Scenario('Guest Payment Sequra i1', (I) => {
    I.sequraPaymentInit();
    I.sequraProcessPaymentGuest();
    I.sequraSelectI1Payment();
    I.seguraFillSequraInformationI1();
    I.sequraFinishPaymentGuestWithoutCard();
    I.seguraLastStepI1();
    I.see('Thank you');
});
