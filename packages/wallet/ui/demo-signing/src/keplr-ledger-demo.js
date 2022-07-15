// @ts-check
import {
  AminoTypes,
  SigningStargateClient,
  defaultRegistryTypes,
} from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import { html, render } from 'lit-html';
import {
  AGORIC_COIN_TYPE,
  stakeCurrency,
  stableCurrency,
  bech32Config,
} from './chainInfo.js';
import { MsgWalletAction } from './gen/swingset/msgs';

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
 *     owner: string,
 *     action: string,
 *   }
 * }} WalletAction
 */

/**
 * /agoric.swingset.XXX matches package agoric.swingset in swingset/msgs.go
 */
const SwingsetMsgs = {
  MsgWalletAction: {
    typeUrl: '/agoric.swingset.MsgWalletAction',
    aminoType: 'swingset/MsgWalletAction',
  },
};

/** @type {import('@cosmjs/stargate').AminoConverters} */
const SwingsetConverters = {
  // '/agoric.swingset.MsgProvision': {
  //   /* ... */
  // },
  [SwingsetMsgs.MsgWalletAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: ({ owner, action }) => ({ owner, action }),
    fromAmino: ({ owner, action }) => ({ owner, action }),
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
    coinType: AGORIC_COIN_TYPE,
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
  const { coinMinimalDenom: denom } = stakeCurrency;

  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);

  // https://docs.keplr.app/api/#get-address-public-key
  const key = await keplr.getKey(chainId);
  console.log({ key });
  if (!key.isNanoLedger) {
    throw Error('This demo is designed for a ledger key');
  }

  const offlineSigner = keplr.getOfflineSignerOnlyAmino(chainId);
  // const offlineSigner = keplr.getOfflineSignerAuto(chainId);
  console.log({ offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();
  const { address } = account;

  ui.showItems('#accounts', [address]);

  const cosmJS = await connectWithSigner(chainInfo.rpc, offlineSigner, {
    aminoTypes: new AminoTypes(SwingsetConverters),
    registry: aRegistry,
  });
  console.log({ cosmJS });

  ui.onClick('#sign', async _ev => {
    const { accountNumber, sequence } = await cosmJS.getSequence(address);
    console.log({ accountNumber, sequence });

    const send1 = {
      type: 'cosmos-sdk/MsgSend',
      value: {
        amount: [
          {
            amount: '1234567',
            denom,
          },
        ],
        from_address: address,
        to_address: address,
      },
    };

    /** @type {WalletAction} */
    const act1 = {
      typeUrl: '/agoric.swingset.MsgWalletAction',
      value: {
        owner: address,
        action: JSON.stringify(['TODO']),
      },
    };

    const msgs = [act1];
    const fee = {
      amount: [{ amount: '100', denom }],
      gas: '250',
    };
    const memo = 'Some memo';

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
  });
};

/** @param {typeof document} document */
const makeUI = document => {
  return freeze({
    /** @param { string } selector */
    inputValue: selector =>
      check.theInput(document.querySelector(selector)).value,
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

window.addEventListener('load', _ev => {
  if (!('keplr' in window)) {
    // eslint-disable-next-line no-alert
    alert('Please install keplr extension');
  }
  // @ts-expect-error keplr is injected
  const { keplr } = window;
  makeSigner(makeUI(document), keplr, SigningStargateClient.connectWithSigner);
});
