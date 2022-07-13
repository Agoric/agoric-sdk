// @ts-check
import { SigningStargateClient } from '@cosmjs/stargate';
import { html, render } from 'lit-html';
import { NETWORK_CONFIGS, suggestChain } from './chainInfo.js';

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
 * @param {ReturnType<typeof makeUI>} ui
 * @param {*} keplr
 */
const makeSigner = async (ui, keplr) => {
  const chainId = ui.selectValue('select[name="chainId"]');
  console.log({ chainId });

  // Enabling before using the Keplr is recommended.
  // This method will ask the user whether to allow access if they haven't visited this website.
  // Also, it will request that the user unlock the wallet if the wallet is locked.
  await keplr.enable(chainId);

  // https://docs.keplr.app/api/#get-address-public-key
  const key = await keplr.getKey(chainId);
  console.log({ key });
  if (!key.isNanoLedger) {
    throw Error('This demo requires a ledger key');
  }

  const offlineSigner = keplr.getOfflineSignerOnlyAmino(chainId);
  console.log({ offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();

  ui.showItems('#accounts', [account.address]);

  const [_main, [networkConfig, caption]] = NETWORK_CONFIGS;
  ui.onClick('#sign', async _ev => {
    // const cosmJS = await suggestChain(networkConfig, caption, {
    //   fetch,
    //   keplr,
    //   SigningClient: SigningStargateClient,
    //   random: Math.random,
    // });

    // console.log({ cosmJS });
    const { address } = account;

    const msgs = [
      {
        type: 'cosmos-sdk/MsgSend',
        value: {
          amount: [
            {
              amount: '1234567',
              denom: 'ucosm',
            },
          ],
          from_address: address,
          to_address: address,
        },
      },
    ];
    const fee = {
      amount: [{ amount: '100', denom: 'ucosm' }],
      gas: '250',
    };
    const memo = 'Some memo';
    const sequence = '0'; // @@
    const accountNumber = '0';

    const signDoc = {
      chain_id: chainId,
      account_number: accountNumber,
      sequence: '0',
      fee,
      memo,
      msgs,
    };

    // const tx = await cosmJS.signAmino(chainId, account.address, signDoc);
    const signerData = { accountNumber, sequence, chainId };
    console.log('sign', { address, msgs, fee, memo, signerData });

    // const tx = await offlineSigner.sign(address, msgs, fee, memo, signerData);
    const tx = await keplr.signAmino(chainId, address, signDoc);

    console.log({ tx });
    // Example transaction
    // const amount = {
    //   denom: 'ubld',
    //   amount: '1234567',
    // };
    // await cosmJS.sendTokens(
    //   account.address,
    //   'agoric123456',
    //   [amount],
    //   {
    //     amount: [
    //       {
    //         amount: '500000',
    //         denom: 'urun',
    //       },
    //     ],
    //     gas: '890000',
    //   },
    //   'enjoy!',
    // );
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
  makeSigner(makeUI(document), keplr);
});
