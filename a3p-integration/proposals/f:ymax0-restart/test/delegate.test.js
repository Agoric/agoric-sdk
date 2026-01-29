// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { agoric, mkTemp } from '@agoric/synthetic-chain';
import test from 'ava';
import { writeFile } from 'node:fs/promises';
import { walletUpdates } from './walletUpdates.js';

// see ../prepare.sh for mnemonic
const ymaxControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const wup = walletUpdates(
  () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
  { setTimeout, log: () => {} },
);

/** @param {any} x */
const boardId = x => x.getBoardId();

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

/**
 * @param {string} addr
 * @param {BridgeAction} action
 */
const sendWalletAction = async (addr, action) => {
  const capData = vsc.marshaller.toCapData(harden(action));
  const f1 = await mkTemp('offer-send-XXX');
  await writeFile(f1, JSON.stringify(capData), 'utf-8');
  return agoric.wallet(
    'send',
    '--from',
    addr,
    '--keyring-backend=test',
    '--offer',
    f1,
  );
};

test.before('get current ymax0 instance', async t => {
  const { ymax0 } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  t.context = {
    ymax0InstanceId: boardId(ymax0),
  };
});

test.serial('terminate existing instance', async t => {
  const id = 'terminate.0';
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'terminate',
      args: [{ message: 'terminate in order to restart the contract' }],
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'undefined' });
});

test.serial('invoke ymaxControl showing no instance', async t => {
  const id = 'getCreatorFacet.1';
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'creatorFacet', overwrite: true },
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  await t.throwsAsync(wup.invocation(id), {
    message: /no StartedInstanceKit/,
  });
});

test.serial('start using ymaxControl', async t => {
  const { BLD, USDC, PoC26 } = fromEntries(
    await vsc.readPublished('agoricNames.issuer'),
  );

  const { ymax0: installation } = fromEntries(
    /** @type {Array<[string, import('@agoric/zoe').Installation]>}*/ (
      await vsc.readPublished('agoricNames.installation')
    ),
  );

  const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });

  const evmContractAddressesStub = {
    aavePool: '0x',
    compound: '0x',
    factory: '0x',
    usdc: '0x',
  };

  // Stubs to satisfy the private args state shape checks
  const privateArgsOverrides = {
    axelarIds: {
      Arbitrum: 'arbitrum',
      Avalanche: 'Avalanche',
      Base: 'base',
      Ethereum: 'Ethereum',
      Optimism: 'optimism',
      Polygon: 'Polygon',
    },
    contracts: {
      Arbitrum: evmContractAddressesStub,
      Avalanche: evmContractAddressesStub,
      Base: evmContractAddressesStub,
      Ethereum: evmContractAddressesStub,
      Optimism: evmContractAddressesStub,
      Polygon: evmContractAddressesStub,
    },
    gmpAddresses: {
      AXELAR_GAS: 'axelar1gas',
      AXELAR_GMP: 'axelar1gmp',
    },
  };

  const id = 'start.2';
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'start',
      args: [{ installation, issuers, privateArgsOverrides }],
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'copyRecord' });
});

test.serial('invoke ymaxControl to getCreatorFacet', async t => {
  const id = 'getCreatorFacet.3';

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'creatorFacet', overwrite: true },
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), {
    name: 'creatorFacet',
    passStyle: 'remotable',
  });
});

test.serial('ymax0 told zoe that Access token is required', async t => {
  const { ymax0 } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  // @ts-expect-error ExecutionContext<unknown>
  t.not(boardId(ymax0), t.context.ymax0InstanceId, 'ymax0 has a new instance');

  const id = 'open.132';

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'contract',
        // @ts-expect-error XXX Type 'import("...node_modules/@agoric/zoe/src/zoeService/types").Instance' is not assignable to type 'globalThis.Instance'.
        instance: ymax0,
        publicInvitationMaker: 'makeOpenPortfolioInvitation',
      },
      proposal: {},
    },
  };

  await sendWalletAction(ymaxControlAddr, redeemAction);

  await t.throwsAsync(wup.offerResult(id), {
    message: /missing properties \["Access"\]/,
  });
});
