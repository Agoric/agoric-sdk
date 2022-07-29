// @ts-check
import { Random } from '@cosmjs/crypto';
import { SigningStargateClient } from '@cosmjs/stargate';
import * as tendermintRpcStar from '@cosmjs/tendermint-rpc';
import { html, render } from 'lit-html';
import {
  AGORIC_COIN_TYPE,
  COSMOS_COIN_TYPE,
  stakeCurrency,
  stableCurrency,
  bech32Config,
  SwingsetMsgs, // TODO: move to keyManagement.js?
} from './chainInfo.js';

import {
  makeOfferSigner,
  makeLocalStorageSigner,
  makeExecActionMessages,
  trivialFee,
} from '../../src/util/keyManagement.js';

const { freeze } = Object;
const { Tendermint34Client } = tendermintRpcStar;

// agoric start local-chain
const localChainInfo = {
  rpc: 'http://localhost:26657',
  rest: '@@TODO: fixme',
  chainId: 'agoric',
  chainName: 'Agoric local-chain',
  stakeCurrency,
  // walletUrlForStaking: `https://${network}.staking.agoric.app`,
  bip44: {
    coinType: COSMOS_COIN_TYPE,
    // coinType: AGORIC_COIN_TYPE, // ISSUE: how do we switch on this before we know isNanoLedger?
  },
  bech32Config,
  currencies: [stakeCurrency, stableCurrency],
  feeCurrencies: [stableCurrency],
  features: ['stargate', 'ibc-transfer'],
};

const check = {
  /**
   * @param {T?} x
   * @param { string= } context
   * @returns { T }
   * @template T
   */
  notNull(x, context) {
    if (!x) {
      throw Error(`null/undefined ${context}`);
    }
    return x;
  },

  /** @type { (elt: unknown) => HTMLButtonElement } */
  theButton(elt) {
    if (!(elt instanceof HTMLButtonElement)) {
      throw Error('not Button');
    }
    return elt;
  },

  /** @type { (elt: unknown) => HTMLInputElement } */
  theInput(elt) {
    if (!(elt instanceof HTMLInputElement)) {
      throw Error('not input');
    }
    return elt;
  },

  /** @type { (elt: unknown) => HTMLTextAreaElement } */
  theTextArea(elt) {
    if (!(elt instanceof HTMLTextAreaElement)) {
      throw Error('not input');
    }
    return elt;
  },

  theSelect(elt) {
    if (!(elt instanceof HTMLSelectElement)) {
      throw Error('not select');
    }
    return elt;
  },
};

/** @param {typeof document} document */
const makeUI = document => {
  const ui = freeze({
    /** @param { string } selector */
    inputValue: selector =>
      check.theInput(document.querySelector(selector)).value,
    textValue: selector =>
      check.theTextArea(document.querySelector(selector)).value,
    setValue: (selector, value) =>
      (check.theInput(document.querySelector(selector)).value = value),
    setChecked: (selector, value) =>
      (check.theInput(document.querySelector(selector)).checked = value),
    /** @param { string } selector */
    selectValue: selector => {
      const sel = check.theSelect(document.querySelector(selector));
      return sel.options[sel.selectedIndex].value;
    },
    onClick: (selector, handler) =>
      check
        .theButton(document.querySelector(selector))
        .addEventListener('click', handler),
    showItems: (selector, items) =>
      render(
        html`<ul>
          ${items.map(item => html`<li>${item}</li>`)}
        </ul>`,
        document.querySelector(selector),
      ),

    /**
     * @param {Awaited<ReturnType<typeof makeOfferSigner>>} s1
     * @param {Awaited<ReturnType<typeof makeLocalStorageSigner>>} s2
     * @param {tendermintRpcStar.Tendermint34Client} rpcClient
     * @param {import('@cosmjs/stargate').SigningStargateClient} lowPrivilegeSigning
     */
    attach: async (s1, s2, rpcClient, lowPrivilegeSigning) => {
      ui.setValue('*[name="account"]', s1.address);
      ui.setChecked('*[name="isNanoLedger"]', s1.isNanoLedger);

      // TODO: catch rejections in event handlers
      ui.onClick('#acceptOffer', async _bev =>
        s1.submitSpendAction(
          ui.textValue('*[name="spendAction"]'),
          ui.inputValue('*[name="memo"]'),
        ),
      );

      ui.setValue('*[name="messagingAccount"]', s2.address);

      const grants = await s2.queryGrants(s1.address, rpcClient);
      console.log({ grants });

      ui.onClick('#makeMessagingAccount', async _bev =>
        s1.authorizeLocalKey(s2.address, Date.now()),
      );

      ui.onClick('#sendMessages', async _bev => {
        const { address } = s2;
        const { accountNumber, sequence } =
          await lowPrivilegeSigning.getSequence(address);
        console.log({ accountNumber, sequence });

        const msgs = makeExecActionMessages(
          s1.address,
          s2.address,
          ui.inputValue('*[name="action"]'),
        );
        const memo = ui.inputValue('*[name="memo"]');

        const fee = trivialFee();

        // TODO: should s2 do the signAndBroadcast like s1?
        console.log('sign non-spend actions', { address, msgs, fee, memo });
        const tx = await lowPrivilegeSigning.signAndBroadcast(
          address,
          msgs,
          fee,
          memo,
        );

        console.log({ tx });
      });
    },
  });

  return ui;
};

window.addEventListener('load', async _ev => {
  if (!('keplr' in window)) {
    // eslint-disable-next-line no-alert
    alert('Please install keplr extension');
  }
  // @ts-expect-error keplr is injected
  const { keplr } = window;
  const ui = makeUI(document);

  const chainInfo = localChainInfo;
  await keplr.experimentalSuggestChain(chainInfo);

  // const chainId = ui.selectValue('select[name="chainId"]');
  const { chainId } = chainInfo;
  await keplr.enable(chainId);
  ui.setValue('*[name="chainId"]', chainId);

  const s1 = await makeOfferSigner(
    chainInfo,
    keplr,
    SigningStargateClient.connectWithSigner,
  );
  const s2 = await makeLocalStorageSigner({
    localStorage: window.localStorage,
    getBytes: Random.getBytes,
  });

  const rpcClient = await Tendermint34Client.connect(chainInfo.rpc);

  const lowPrivilegeClient = await SigningStargateClient.connectWithSigner(
    chainInfo.rpc,
    s2.wallet,
    {
      registry: s2.registry,
    },
  );
  console.log({ lowPrivilegeClient });
  console.log('low priv signer accounts', await s2.wallet.getAccounts());

  ui.attach(s1, s2, rpcClient, lowPrivilegeClient);
});
