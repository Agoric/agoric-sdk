/* eslint-disable ui-testing/no-disabled-tests */

describe('DAPP Offer Up E2E Test Cases', () => {
  context('Test commands', () => {
    it(`should complete Keplr setup by  importing an existing wallet using 24 word phrase`, () => {
      cy.setupWallet({
        privateKey:
          '57ecd5ca73bb97c71ae2c356346b4b615d4e52fb34081fe656e5f6942ca8e56d',
        password: 'Test1234',
        newAccount: true,
        walletName: 'My Wallet 2',
      }).then(setupFinished => {
        expect(setupFinished).to.be.true;
      });
      cy.visit('/');
    });
    it(`should reject connection with wallet`, () => {
      const alertShown = cy.stub().as('alertShown');
      cy.on('window:alert', alertShown);

      cy.contains('Connect Wallet').click();
      cy.rejectAccess().then(rejected => {
        expect(rejected).to.be.true;
      });
      cy.get('@alertShown').should(
        'have.been.calledOnceWith',
        'Request rejected',
      );
    });
    it(`should accept connection with wallet`, () => {
      cy.reload();
      cy.contains('Connect Wallet').click();
      cy.acceptAccess().then(taskCompleted => {
        expect(taskCompleted).to.be.true;
      });
    });
    it(`should reject make an offer transaction`, () => {
      const alertShown = cy.stub().as('alertShown');
      cy.on('window:alert', alertShown);

      cy.contains('Make an Offer').click();
      cy.rejectTransaction().then(taskCompleted => {
        expect(taskCompleted).to.be.true;
      });

      cy.get('@alertShown').should(
        'have.been.calledOnceWith',
        'Offer error: Error: Request rejected',
      );
    });
    it(`should confirm make an offer transaction`, () => {
      cy.reload();
      cy.contains('Connect Wallet').click();
      const alertShown = cy.stub().as('alertShown');
      cy.on('window:alert', alertShown);

      cy.contains('Make an Offer').click();
      cy.confirmTransaction().then(taskCompleted => {
        expect(taskCompleted).to.be.true;
      });

      cy.get('@alertShown').should(
        'have.been.calledOnceWith',
        'Offer accepted',
      );
    });
  });
});
