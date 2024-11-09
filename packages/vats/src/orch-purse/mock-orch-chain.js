import { Fail } from '@endo/errors';
import { Far } from '@endo/pass-style';
import { M } from '@endo/patterns';
import { provideLazy } from '@agoric/store';

import { AmountMath } from '@agoric/ertp';
import { DenomAmountShape } from '@agoric/orchestration';
import {
  MinChainI,
  MinChainShape,
  MinDenomInfoShape,
  MinOrchAccountI,
  MinOrchAccountShape,
  MinOrchestratorI,
} from './typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone'
 */

/**
 * @param {Zone} zone
 */
export const prepareMinOrchestrator = zone => {
  const makeMapStore = zone.detached().mapStore;

  const makeMinOrchAccount = zone.exoClass(
    'MinOrchAccount',
    MinOrchAccountI,
    (chains, denoms, accounts, chain) => {
      const acctAddrValue = `${accounts.getSize()}`;
      return { chains, denoms, accounts, chain, acctAddrValue };
    },
    {
      getAddress() {
        const { chain, acctAddrValue } = this.state;
        const { chainId } = chain.getChainInfo();
        return harden({ chainId, value: acctAddrValue });
      },
      async getBalances() {
        const { accounts, acctAddrValue } = this.state;
        const { balances } = accounts.get(acctAddrValue);
        return [...balances.values()];
      },
      async getBalance(denom) {
        const { accounts, acctAddrValue } = this.state;
        const { balances } = accounts.get(acctAddrValue);
        return balances.get(denom);
      },
      async transfer(destAddr, denomAmount) {
        const { chains, accounts, acctAddrValue } = this.state;
        const { balances: myBalances } = accounts.get(acctAddrValue);

        const { denom, value: deltaValue } = denomAmount;

        const { value: myOldBalanceValue } = myBalances.get(denom);
        // Would be really good to do this source check synchronously, in order
        // TODO is this realistic for the real orch?
        myOldBalanceValue >= deltaValue ||
          Fail`overdrawn ${myOldBalanceValue} - ${deltaValue}`;
        const myNewBalanceValue = myOldBalanceValue - deltaValue;

        // Would be really good to do this source update synchronously, in order
        // TODO is this realistic for the real orch?
        myBalances.set(denom, harden({ denom, value: myNewBalanceValue }));

        await null; // sometime later...

        let destBalances;
        try {
          const { chainId: destChainId, value: destAcctAddrValue } = destAddr;
          const { accounts: destChainAccounts } = chains.get(destChainId);
          ({ balances: destBalances } =
            destChainAccounts.get(destAcctAddrValue));
        } catch (err) {
          // A failure at this point means the `denomAmount` is not yet spent
          // at dest, and so should be restored to `myBalances`. Do so by
          // adding the delta back, rather than restoring `myOldBalanceValue`,
          // since the balances may have been updated in the meantime.
          const { value: myNextOldBalanceValue } = myBalances.get(denom);
          const myNextNewBalanceValue = myNextOldBalanceValue + deltaValue;
          myBalances.set(
            denom,
            harden({ denom, value: myNextNewBalanceValue }),
          );
          throw err;
        }
        if (destBalances.has(denom)) {
          const { value: destOldBalanceValue } = destBalances.get(denom);
          const destNewBalanceValue = destOldBalanceValue + deltaValue;
          destBalances.set(
            denom,
            harden({ denom, value: destNewBalanceValue }),
          );
        } else {
          destBalances.init(denom, harden({ denom, value: deltaValue }));
        }
      },
    },
  );

  const makeMinChain = zone.exoClass(
    'MinChain',
    MinChainI,
    (chains, denoms, chainName) => ({
      chains,
      denoms,
      chainId: chainName,
    }),
    {
      getChainInfo() {
        const { chainId } = this.state;
        return harden({ chainId });
      },
      async makeAccount() {
        const { self } = this;
        const { chains, denoms, chainId } = this.state;
        const { accounts } = chains.get(chainId);

        const account = makeMinOrchAccount(chains, denoms, accounts, self);
        const { value: acctAddrValue } = account.getAddress();
        accounts.init(
          acctAddrValue,
          harden({
            account,
            balances: makeMapStore('balances', {
              keyShape: M.string(), // denom
              valueShape: DenomAmountShape,
            }),
          }),
        );
        return account;
      },
      async makeDenom(denom) {
        const { self } = this;
        const { denoms } = this.state;
        // TODO make a full OrchIssuerKit
        // denoms.init will error if denom is already taken
        denoms.init(
          denom,
          harden({
            brand: Far(`fake ${denom} brand`, {}),
            chain: self,
          }),
        );
        // TODO return orchIssuerKit
      },
    },
  );

  const makeMinOrchestrator = zone.exoClass(
    'MinOrchestrator',
    MinOrchestratorI,
    () => ({
      chains: makeMapStore('chains', {
        keyShape: M.string(), // chainName === chainId
        valueShape: {
          chain: MinChainShape,
          accounts: M.remotable('accounts'),
        },
      }),
      denoms: makeMapStore('denoms', {
        keyShape: M.string(), // denom
        valueShape: MinDenomInfoShape,
      }),
    }),
    {
      getChain(chainName) {
        const { chains, denoms } = this.state;
        const { chain } = provideLazy(chains, chainName, cName =>
          harden({
            chain: makeMinChain(chains, denoms, cName),
            accounts: makeMapStore('accounts', {
              keyShape: M.string(), // acctAddrValue
              valueShape: {
                account: MinOrchAccountShape,
                balances: M.remotable('balances'),
              },
            }),
          }),
        );
        return chain;
      },
      getDenomInfo(denom) {
        const { denoms } = this.state;
        return denoms.get(denom);
      },
      asAmount(denomAmount) {
        const { self } = this;
        const { denom, value } = denomAmount;
        const { brand } = self.getDenomInfo(denom);
        return AmountMath.make(brand, value);
      },
    },
  );
  return makeMinOrchestrator;
};
harden(prepareMinOrchestrator);
