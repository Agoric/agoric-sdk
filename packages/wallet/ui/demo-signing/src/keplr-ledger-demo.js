// @ts-check
import {
  AminoTypes,
  SigningStargateClient,
  defaultRegistryTypes,
} from '@cosmjs/stargate';
import { fromBech32, toBech32, fromBase64, toBase64 } from '@cosmjs/encoding';
import { DirectSecp256k1Wallet, Registry } from '@cosmjs/proto-signing';
import { html, render } from 'lit-html';
import {
  AGORIC_COIN_TYPE,
  COSMOS_COIN_TYPE,
  stakeCurrency,
  stableCurrency,
  bech32Config,
  SwingsetMsgs,
} from './chainInfo.js';
import { MsgWalletAction } from './gen/swingset/msgs';
import {
  makeFeeGrantMessage,
  makeGrantWalletActionMessage,
  makeMessagingSigner,
} from './messagingKey.js';

const { freeze } = Object;

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

/**
 * @typedef {{
 *   typeUrl: '/agoric.swingset.MsgWalletAction',
 *   value: {
 *     owner: string, // base64 of raw bech32 data
 *     action: string,
 *   }
 * }} WalletAction
 */

/** @type {(address: string) => Uint8Array} */
export function toAccAddress(address) {
  return fromBech32(address).data;
}

/** @type {import('@cosmjs/stargate').AminoConverters} */
const SwingsetConverters = {
  // '/agoric.swingset.MsgProvision': {
  //   /* ... */
  // },
  [SwingsetMsgs.MsgWalletAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: proto => {
      const { action, owner } = proto;
      // NOTE: keep "dictionaries" sorted
      const amino = {
        action,
        owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
      };
      console.log('@@toAmino:', { proto, amino });
      return amino;
    },
    fromAmino: amino => {
      const { action, owner } = amino;
      const proto = { action, owner: toBase64(toAccAddress(owner)) };
      console.log('@@fromAmino:', { amino, proto });
      return proto;
    },
  },
};

const aRegistry = new Registry([
  ...defaultRegistryTypes,
  [SwingsetMsgs.MsgWalletAction.typeUrl, MsgWalletAction],
]);

// agoric start local-chain
const localChainInfo = {
  rpc: 'http://localhost:26657',
  // rest: api,
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

/**
 * @param {ReturnType<typeof makeUI>} ui
 * @param {*} keplr
 * @param {typeof SigningStargateClient.connectWithSigner} connectWithSigner
 */
const makeSigner = async (ui, keplr, connectWithSigner) => {
  // const chainId = ui.selectValue('select[name="chainId"]');
  // console.log({ chainId });

  const chainInfo = localChainInfo;
  const { chainId } = chainInfo;
  ui.setValue('*[name="chainId"]', chainId);
  const { coinMinimalDenom: denom } = stakeCurrency;

  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);

  // https://docs.keplr.app/api/#get-address-public-key
  const key = await keplr.getKey(chainId);
  console.log({ key });

  ui.setChecked('*[name="isNanoLedger"]', key.isNanoLedger);

  // const offlineSigner = await keplr.getOfflineSignerOnlyAmino(chainId);
  const offlineSigner = await keplr.getOfflineSignerAuto(chainId);
  console.log({ offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();
  const { address } = account;
  ui.setValue('*[name="account"]', address);

  const cosmJS = await connectWithSigner(chainInfo.rpc, offlineSigner, {
    aminoTypes: new AminoTypes(SwingsetConverters),
    registry: aRegistry,
  });
  console.log({ cosmJS });

  const fee = {
    amount: [{ amount: '100', denom }],
    gas: '100000', // TODO: estimate gas?
  };
  const allowance = '250000'; // 0.25 IST

  return freeze({
    authorizeMessagingKey: async (grantee, t0) => {
      const expiration = t0 / 1000 + 4 * 60 * 60;
      const msgs = [
        makeGrantWalletActionMessage(address, grantee, expiration),
        makeFeeGrantMessage(address, grantee, allowance, expiration),
      ];
      const tx = await cosmJS.signAndBroadcast(address, msgs, fee, '');

      console.log({ tx });
      return tx;
    },
    sign: async (action, memo) => {
      const { accountNumber, sequence } = await cosmJS.getSequence(address);
      console.log({ accountNumber, sequence });

      const send1 = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          amount: [
            {
              amount: '1234567',
              denom,
            },
          ],
          fromAddress: address,
          toAddress: address,
        },
      };

      /** @type {WalletAction} */
      const act1 = {
        typeUrl: '/agoric.swingset.MsgWalletAction',
        value: {
          owner: toBase64(toAccAddress(address)),
          action,
        },
      };

      const msgs = [act1];

      const signDoc = {
        chain_id: chainId,
        account_number: `${accountNumber}`,
        sequence: `${sequence}`,
        fee,
        memo,
        msgs,
      };

      // const tx = await cosmJS.signAmino(chainId, account.address, signDoc);
      const signerData = { accountNumber, sequence, chainId };
      console.log('sign', { address, msgs, fee, memo, signerData });

      // const tx = await offlineSigner.signAmino(address, signDoc);

      const tx = await cosmJS.signAndBroadcast(address, msgs, fee, memo);

      console.log({ tx });
      return tx;
    },
  });
};

/** @param {typeof document} document */
const makeUI = document => {
  return freeze({
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
  });
};

window.addEventListener('load', async _ev => {
  if (!('keplr' in window)) {
    // eslint-disable-next-line no-alert
    alert('Please install keplr extension');
  }
  // @ts-expect-error keplr is injected
  const { keplr } = window;
  const ui = makeUI(document);

  const s1 = await makeSigner(
    ui,
    keplr,
    SigningStargateClient.connectWithSigner,
  );

  ui.onClick('#sign', async _bev =>
    s1.sign(ui.textValue('*[name="action"]'), ui.inputValue('*[name="memo"]')),
  );

  const s2 = await makeMessagingSigner({ localStorage: window.localStorage });
  ui.setValue('*[name="messagingAccount"]', s2.address);

  ui.onClick('#makeMessagingAccount', async _bev =>
    s1.authorizeMessagingKey(s2.address, Date.now()),
  );
});
