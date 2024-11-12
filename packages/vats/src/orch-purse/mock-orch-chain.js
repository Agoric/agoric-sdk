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

const makeMinDenomInfo = (chain, _denom) => {
  const brand = {}; // TODO the whole thing
  return harden({
    brand,
    chain,
  });
};

/**
 * @param {Zone} zone
 */
export const prepareMinOrchestrator = zone => {
  const makeMinOrchAccount = zone.exoClass(
    'MinOrchAccount',
    MinOrchAccountI,
    (chain, ledger) => {
      const addrValue = `${ledger.size()}`;
      return { chain, ledger, addrValue };
    },
    {
      getAddress() {
        const { chain, addrValue: value } = this.state;
        const { chainId } = chain.getChainInfo();
        return harden({ chainId, value });
      },
      getBalances() {
        const { ledger, addrValue } = this.state;
        const { balances } = ledger.get(addrValue);
        return [...balances.values()];
      },
      getBalance(denom) {
        const { ledger, addrValue } = this.state;
        const { balances } = ledger.get(addrValue);
        return balances.get(denom);
      },
      transfer(destAddr, denomAmount) {

      },
    },
  );

  const makeMinChain = zone.exoClass(
    'MinChain',
    MinChainI,
    chainName => ({
      chainId: chainName,
      denoms: zone.mapStore('denoms', {
        keyShape: M.string(), // denom
        valueShape: MinDenomInfoShape,
      }),
      ledger: zone.mapStore('accounts', {
        keyShape: M.string(), // addrValue
        valueShape: {
          account: MinOrchAccountShape,
          balances: M.remotable('balances'),
        },
      }),
    }),
    {
      getChainInfo() {
        const { chainId } = this.state;
        return harden({ chainId });
      },
      makeAccount() {
        const { ledger } = this.state;
        const { self } = this;
        const account = makeMinOrchAccount(self, ledger);
        const { value: addrValue } = account.getAddress();
        ledger.init(
          addrValue,
          harden({
            account,
            balances: zone.mapStore('balances', {
              keyShape: M.string(), // denom
              valueShape: DenomAmountShape,
            }),
          }),
        );
        return account;
      },
      getDenomInfo(denom) {
        const { denoms } = this.state;
        const { self } = this;
        return provideLazy(denoms, denom, d => makeMinDenomInfo(self, d));
      },
      asAmount(denomAmount) {
        const { self } = this;
        const { denom, value } = denomAmount;
        const { brand } = self.getDenomInfo(denom);
        return AmountMath.make(brand, value);
      },
    },
  );

  const makeMinOrchestrator = zone.exoClass(
    'MinOrchestrator',
    MinOrchestratorI,
    () => ({
      chains: zone.mapStore('chains', {
        keyShape: M.string(),
        valueShape: MinChainShape,
      }),
    }),
    {
      getChain(chainName) {
        const { chains } = this.state;
        return provideLazy(chains, chainName, makeMinChain);
      },
    },
  );
  return makeMinOrchestrator;
};
harden(prepareMinOrchestrator);
