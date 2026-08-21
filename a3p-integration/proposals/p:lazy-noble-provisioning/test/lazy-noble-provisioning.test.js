// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { getPermitWitnessTransferFromData } from '@agoric/orchestration/src/utils/permit2.ts';
import { makeExpectUnhandledRejectionMacro } from '@agoric/internal/src/lib-nodejs/ava-unhandled-rejection.js';
import { recoverTypedDataAddress } from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import {
  makeWalletStoreFromSigner,
  makeYmaxControlKitForSynthetic,
} from '@aglocal/portfolio-deploy/src/ymax-control.js';
import {
  getDetailsMatchingVats,
  getVatInfoFromID,
} from '@agoric/synthetic-chain';
import anyTest from 'ava';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { Agent, fetch as undiciFetch } from 'undici';
import { privateKeyToAccount } from 'viem/accounts';
import { makeSyntheticWalletKit } from '../synthetic-wallet-kit.js';

/**
 * @import {EVMWalletMessageHandler} from '@aglocal/portfolio-contract/src/evm-wallet-handler.exo.ts';
 * @import {PortfolioPlanner} from '@aglocal/portfolio-contract/src/planner.exo.ts';
 * @import {StatusFor} from '@agoric/portfolio-api';
 * @import {WalletStoreEntryProxy} from '@agoric/client-utils/src/wallet-store.ts';
 * @import {TestFn} from 'ava';
 */

const ymax1ControlAddress = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';
const bundleIdPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/dist/ymax0.bundleId';
const privateArgsPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/test/privateArgs-ymax1.json';
const rpcDispatcher = new Agent();
const rpcFetch = /** @type {typeof globalThis.fetch} */ (
  /** @type {unknown} */ (
    (input, init) => undiciFetch(input, { ...init, dispatcher: rpcDispatcher })
  )
);
const vsc = makeVstorageKit({ fetch: rpcFetch }, LOCAL_CONFIG);
const fromPublishedEntries = async path =>
  Object.fromEntries(await vsc.readPublished(path));

let walletNonce = 0;
const makeNonce = () =>
  `lazy-noble-provisioning-a3p-${Date.now()}-${(walletNonce += 1)}`;

const makeStore = address => {
  const signer = makeSyntheticWalletKit({ address, vstorageKit: vsc });
  return makeWalletStoreFromSigner(signer, {
    setTimeout,
    makeNonce,
    log: () => {},
  });
};

const getKeyAddress = keyName =>
  execFileSync(
    'agd',
    ['keys', 'show', '-a', keyName, '--keyring-backend=test'],
    { encoding: 'utf8' },
  ).trim();

const eventuallyReadWhere = async (path, predicate, description) => {
  let lastValue;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      lastValue = await vsc.readPublished(path);
      if (predicate(lastValue)) return lastValue;
    } catch {
      // The path may not have been published yet.
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  const detail = JSON.stringify(lastValue, (_key, value) =>
    typeof value === 'bigint' ? `${value}n` : value,
  );
  throw Error(`${description}; last value: ${detail}`);
};

const ethAccount = privateKeyToAccount(
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);

const signMessage = async message => {
  const signed = harden({
    ...message,
    signature: await ethAccount.signTypedData(message),
  });
  const verifiedSigner = await recoverTypedDataAddress(signed);
  assert(verifiedSigner === ethAccount.address);
  return harden({ ...signed, verifiedSigner });
};

const makeContext = async () => {
  const bundleId = (await readFile(bundleIdPath, 'utf8')).trim();
  assert(bundleId.startsWith('b1-'));
  const { chainInfo, contracts } = JSON.parse(
    await readFile(privateArgsPath, 'utf8'),
  );
  const control = makeYmaxControlKitForSynthetic(
    { setTimeout },
    {
      signer: makeSyntheticWalletKit({
        address: ymax1ControlAddress,
        vstorageKit: vsc,
      }),
      makeNonce,
      log: () => {},
    },
  );
  const { ymax1: instance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  const vats = (await getDetailsMatchingVats('ymax1')).filter(
    vat => !vat.terminated,
  );
  assert(vats.length > 0);
  return {
    bundleId,
    chainInfo: harden(chainInfo),
    contracts: harden(contracts),
    control,
    instance,
    vatDetails: vats.at(-1),
  };
};

const test = /** @type {TestFn<Awaited<ReturnType<typeof makeContext>>>} */ (
  anyTest
);
const expectUnhandled = makeExpectUnhandledRejectionMacro({
  test,
  importMetaUrl: import.meta.url,
});

test.before(async t => {
  t.context = await makeContext();
});

test.serial('upgrade ymax1 and provision handler and planner', async t => {
  const { bundleId, contracts, control, instance, vatDetails } = t.context;
  assert(vatDetails);
  const { postalService: postalServiceInstance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  await control.ymaxControl.upgrade({
    bundleId,
    privateArgsOverrides: harden({ contracts, postalServiceInstance }),
  });

  const { ymax1: upgradedInstance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  t.is(upgradedInstance.getBoardId(), instance.getBoardId());
  const vatInfo = await getVatInfoFromID(vatDetails.vatID);
  t.is(
    /** @type {{incarnation: number}} */ (vatInfo.currentSpan()).incarnation,
    vatDetails.incarnation + 1,
  );

  const { result: creatorFacet } =
    await control.ymaxControl.getCreatorFacet.once({
      saveAs: 'creatorFacet',
      overwrite: true,
    })();
  assert(creatorFacet);
  const { ymax1, postalService } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  const handlerAddress = getKeyAddress('evmHandler');
  const plannerAddress = getKeyAddress('planner');
  await creatorFacet.deliverEVMWalletHandlerInvitation(
    handlerAddress,
    postalService,
  );
  await creatorFacet.deliverPlannerInvitation(plannerAddress, postalService);

  await makeStore(handlerAddress).saveOfferResult(
    { instance: ymax1, description: 'evmWalletHandler' },
    'evmWalletHandler',
  );
  await makeStore(plannerAddress).saveOfferResult(
    { instance: ymax1, description: 'planner' },
    'planner',
  );
});

test.serial(
  'ETH open defers Noble until a Noble-dependent plan',
  expectUnhandled(0),
  async t => {
    const { chainInfo, contracts } = t.context;
    const handlerStore = makeStore(getKeyAddress('evmHandler'));
    /** @type {WalletStoreEntryProxy<EVMWalletMessageHandler>} */
    const handler = handlerStore.get('evmWalletHandler', { sendOnly: true });
    const plannerStore = makeStore(getKeyAddress('planner'));
    /** @type {WalletStoreEntryProxy<PortfolioPlanner>} */
    const planner = plannerStore.get('planner');
    const base = contracts.Base;
    const chainId = BigInt(chainInfo.Base.reference);
    const deadline = BigInt(Math.floor(Date.now() / 1_000) + 3_600);
    const depositValue = 1_000_000n;
    const { USDC } = await fromPublishedEntries('agoricNames.brand');
    assert(USDC);
    const amount = harden({ brand: USDC, value: depositValue });

    const openWitness = getYmaxWitness('OpenPortfolio', {
      allocations: [{ instrument: '@Base', portion: 100n }],
    });
    const openMessage = getPermitWitnessTransferFromData(
      {
        permitted: { token: base.usdc, amount: depositValue },
        spender: base.depositFactory,
        nonce: 1n,
        deadline,
      },
      base.permit2,
      chainId,
      openWitness,
    );
    await handler.handleMessage(await signMessage(openMessage));

    const walletPath = `ymax1.evmWallets.${ethAccount.address}`;
    const openStatus = await eventuallyReadWhere(
      walletPath,
      value => value?.status === 'ok' && /^portfolio\d+$/.test(value.result),
      'signed ETH-wallet open did not succeed',
    );
    const portfolioKey = openStatus.result;
    const portfolioId = Number(portfolioKey.replace('portfolio', ''));
    const portfolioPath = `ymax1.portfolios.${portfolioKey}`;
    /** @type {StatusFor['portfolio']} */
    const opened = await eventuallyReadWhere(
      portfolioPath,
      value => Boolean(value?.accountIdByChain?.agoric),
      'Agoric LCA was not published after open',
    );
    t.truthy(opened.accountIdByChain.agoric, 'Agoric LCA must be provisioned');
    t.false(
      'noble' in opened.accountIdByChain,
      'Noble ICA must not be provisioned',
    );
    t.false(
      'noble' in (opened.accountStateByChain || {}),
      'Noble provisioning must not begin during open',
    );

    const rebalanceMessage = getYmaxStandaloneOperationData(
      {
        portfolio: BigInt(portfolioId),
        nonce: 2n,
        deadline,
      },
      'Rebalance',
      chainId,
      base.depositFactory,
    );
    await handler.handleMessage(await signMessage(rebalanceMessage));
    const rebalanceStatus = await eventuallyReadWhere(
      walletPath,
      value => value?.status === 'ok' && /^flow\d+$/.test(value.result),
      'signed rebalance did not start',
    );
    const rebalanceFlowKey = rebalanceStatus.result;
    /** @type {StatusFor['portfolio']} */
    const awaitingPlan = await eventuallyReadWhere(
      portfolioPath,
      value => value?.flowsRunning?.[rebalanceFlowKey]?.awaitingSteps === true,
      'rebalance was not awaiting a plan',
    );
    await planner.resolvePlan(
      portfolioId,
      Number(rebalanceFlowKey.replace('flow', '')),
      [
        {
          src: '@agoric',
          dest: '@noble',
          amount,
        },
      ],
      awaitingPlan.policyVersion,
      awaitingPlan.rebalanceCount,
    );

    const failedFlow = await eventuallyReadWhere(
      `${portfolioPath}.flows.${rebalanceFlowKey}`,
      value => value?.state === 'fail',
      'synthetic-chain Noble provisioning failure did not settle',
    );
    const nobleConnectionId =
      chainInfo.agoric.connections[chainInfo.noble.chainId].id;
    t.true(
      failedFlow.error.includes(`${nobleConnectionId}: connection not found`),
      'Noble provisioning must use the configured Agoric-to-Noble connection',
    );

    // The RPC dispatcher owns three persistent vstorage connections. Destroy
    // them while the rejection tracker contains their teardown rejections.
    await t.throwsAsync(rpcDispatcher.destroy(), {
      message: /ClientDestroyedError/,
    });
  },
);
