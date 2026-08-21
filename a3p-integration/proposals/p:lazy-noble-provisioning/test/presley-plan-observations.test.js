// @ts-check
import '@endo/init/debug.js';

import {
  makeWalletStoreFromSigner,
  makeYmaxControlKitForSynthetic,
} from '@aglocal/portfolio-deploy/src/ymax-control.js';
import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { getPermitWitnessTransferFromData } from '@agoric/orchestration/src/utils/permit2.ts';
import { recoverTypedDataAddress } from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { portfolioPermissionsToEIP712 } from '@agoric/portfolio-api/src/portfolio-permissions.js';
import {
  agd as agdAmbient,
  agoric as agoricAmbient,
  getDetailsMatchingVats,
  getVatInfoFromID,
} from '@agoric/synthetic-chain';
import anyTest from 'ava';
import { readFile } from 'node:fs/promises';
import { get } from 'node:http';
import { privateKeyToAccount } from 'viem/accounts';
import { makeSyntheticWalletKit } from '../synthetic-wallet-kit.js';

/**
 * @import {EVMWalletMessageHandler} from '@aglocal/portfolio-contract/src/evm-wallet-handler.exo.ts';
 * @import {PortfolioDelegationClient} from '@aglocal/portfolio-contract/src/delegation.exo.ts';
 * @import {EVMContractAddresses, PortfolioPrivateArgs} from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import {PortfolioPlanner} from '@aglocal/portfolio-contract/src/planner.exo.ts';
 * @import {ExternalPortfolioPermissions, PortfolioKey, PortfolioPublishedPathTypes, StatusFor} from '@agoric/portfolio-api';
 * @import {WalletStoreEntryProxy} from '@agoric/client-utils/src/wallet-store.ts';
 * @import {VstorageKit} from '@agoric/client-utils';
 * @import {PrivateKeyAccount} from 'viem';
 * @import {TestFn} from 'ava';
 */

/** @typedef {ReturnType<typeof makeWalletStoreFromSigner>} WalletStore */

const ymax1ControlAddress = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';
const bundleIdPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/dist/ymax0.bundleId';
const privateArgsPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/test/privateArgs-ymax1.json';

/**
 * Work around Node's global fetch/Undici conflicting with SES lockdown. During
 * shutdown, after the assertions pass, Undici emits unhandled rejections with
 * `TypeError: Cannot assign to read only property 'message' of object
 * 'ClientDestroyedError'`, causing AVA to exit with status 1.
 *
 * @type {typeof fetch}
 */
const rpcFetch = /** @type {typeof fetch} */ (
  resource =>
    new Promise((resolve, reject) => {
      const request = get(String(resource), response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve(
            /** @type {Response} */ ({
              json: async () => JSON.parse(body),
            }),
          );
        });
      });
      request.on('error', reject);
    })
);

const getKeyAddress = (agd, keyName) =>
  agd.keys('show', '-a', keyName, '--keyring-backend=test').then(s => s.trim());

/**
 * @template T
 * @param {Promise<[string, T][]>} p
 * @returns {Promise<Record<string, T>>}
 */
const fromEntriesP = p => p.then(Object.fromEntries);

/**
 * @param {PortfolioKey} portfolioKey
 * @param {VstorageKit<PortfolioPublishedPathTypes>} vsc
 * @param {(...args: unknown[]) => void} log the current test's t.log
 */
const makePortfolioReader = (portfolioKey, vsc, log) => {
  const id = Number(portfolioKey.replace('portfolio', ''));
  const path = /** @type {const} */ (`ymax1.portfolios.${portfolioKey}`);
  const agentsPath = /** @type {const} */ (`${path}.agents`);
  const waitFor = (publishedPath, predicate, description) =>
    retryUntilCondition(
      () => vsc.readPublished(publishedPath),
      predicate,
      description,
      { setTimeout, retryIntervalMs: 3_000, maxRetries: 10, log },
    );

  return harden({
    id,
    path,
    agentsPath,
    readStatus: () => vsc.readPublished(path),
    readAgents: () => vsc.readPublished(agentsPath),
    waitForStatus: (predicate, description) =>
      waitFor(path, predicate, description),
    waitForAgents: (predicate, description) =>
      waitFor(agentsPath, predicate, description),
    waitForFlow: (flowKey, predicate, description) =>
      waitFor(`${path}.flows.${flowKey}`, predicate, description),
  });
};

/**
 * @param {{
 *   account: PrivateKeyAccount,
 *   handler: WalletStoreEntryProxy<EVMWalletMessageHandler>,
 *   base: EVMContractAddresses,
 *   chainId: bigint,
 *   vsc: VstorageKit<PortfolioPublishedPathTypes>,
 *   now: () => number,
 *   log: (...args: unknown[]) => void,
 * }} opts
 */
const makeEvmOwner = ({ account, handler, base, chainId, vsc, now, log }) => {
  let ownerNonce = 0n;
  /** @type {number} set by openPortfolio, which every other method follows */
  let openedId;
  const walletPath = /** @type {const} */ (
    `ymax1.evmWallets.${account.address}`
  );
  const submitMessage = async (makeMessage, description) => {
    ownerNonce += 1n;
    const messageNonce = ownerNonce;
    const deadline = BigInt(Math.floor(now() / 1_000) + 3_600);
    const message = makeMessage(messageNonce, deadline);
    const signed = harden({
      ...message,
      signature: await account.signTypedData(message),
    });
    const verifiedSigner = await recoverTypedDataAddress(signed);
    assert(verifiedSigner === account.address);
    await handler.handleMessage(harden({ ...signed, verifiedSigner }));
    const status = await retryUntilCondition(
      () => vsc.readPublished(walletPath),
      value =>
        value?.nonce === messageNonce &&
        value?.deadline === deadline &&
        value?.status === 'ok',
      description,
      { setTimeout, retryIntervalMs: 3_000, maxRetries: 10, log },
    );
    // re-establish, for tsc, what the predicate above already required
    assert.equal(status.status, 'ok');
    return status;
  };

  return harden({
    async openPortfolio({ allocations, depositAmount, grantee }) {
      const status = await submitMessage((messageNonce, messageDeadline) => {
        const witness = getYmaxWitness('OpenPortfolio', {
          allocations,
          grantee: {
            address: grantee.address,
            permissions: portfolioPermissionsToEIP712(grantee.permissions),
          },
        });
        return getPermitWitnessTransferFromData(
          {
            permitted: { token: base.usdc, amount: depositAmount },
            spender: base.depositFactory,
            nonce: messageNonce,
            deadline: messageDeadline,
          },
          base.permit2,
          chainId,
          witness,
        );
      }, 'signed open+grant did not succeed');
      assert.typeof(status.result, 'string');
      const reader = makePortfolioReader(
        /** @type {PortfolioKey} */ (status.result),
        vsc,
        log,
      );
      openedId = reader.id;
      return reader;
    },
    async changePermissions(agentId, permissions) {
      await submitMessage(
        (messageNonce, messageDeadline) =>
          getYmaxStandaloneOperationData(
            {
              agentId: BigInt(agentId),
              permissions: portfolioPermissionsToEIP712(permissions),
              portfolio: BigInt(openedId),
              nonce: messageNonce,
              deadline: messageDeadline,
            },
            'ChangePermissions',
            chainId,
            base.depositFactory,
          ),
        'signed permission change did not succeed',
      );
    },
    async revoke(agentId) {
      await submitMessage(
        (messageNonce, messageDeadline) =>
          getYmaxStandaloneOperationData(
            {
              agentId: BigInt(agentId),
              portfolio: BigInt(openedId),
              nonce: messageNonce,
              deadline: messageDeadline,
            },
            'Revoke',
            chainId,
            base.depositFactory,
          ),
        'signed revocation did not succeed',
      );
    },
  });
};

const makeDelegate = async ({ id, instance, store }) => {
  await store.saveOfferResult(
    { instance, description: 'portfolioMandate' },
    'portfolioMandate',
  );
  /** @type {WalletStoreEntryProxy<PortfolioDelegationClient>} */
  const delegation = store.get('portfolioMandate');

  return harden({
    id,
    key: /** @type {const} */ (`agent${id}`),
    setTargetAllocation(targetAllocation, portfolioStatus, agentMemo) {
      return delegation.setTargetAllocation(
        harden({
          targetAllocation,
          syncState: {
            policyVersion: portfolioStatus.policyVersion,
            rebalanceCount: portfolioStatus.rebalanceCount,
          },
          ...(agentMemo && { agentMemo }),
        }),
      );
    },
  });
};

const makePlanner = store => {
  /** @type {WalletStoreEntryProxy<PortfolioPlanner>} */
  const planner = store.get('planner');

  const resolve = (reader, flowKey, status, observations) => {
    const flowId = Number(flowKey.replace('flow', ''));
    return observations
      ? planner.resolvePlan(
          reader.id,
          flowId,
          [],
          status.policyVersion,
          status.rebalanceCount,
          observations,
        )
      : planner.resolvePlan(
          reader.id,
          flowId,
          [],
          status.policyVersion,
          status.rebalanceCount,
        );
  };

  return harden({
    async completeOpening(reader) {
      const status = await reader.waitForStatus(
        value => Object.keys(value?.flowsRunning || {}).length === 1,
        'opening flow was not published',
      );
      const flowKey = Object.keys(status.flowsRunning || {})[0];
      assert(flowKey);
      await resolve(reader, flowKey, status);
      await reader.waitForFlow(
        flowKey,
        value => value?.state === 'done',
        'opening flow did not complete',
      );
    },
    async resolveDelegatedPlan(reader, agentKey, observations) {
      const awaiting = value =>
        Object.entries(value?.flowsRunning || {}).find(
          ([, flow]) => flow.awaitingSteps === true && flow.agent === agentKey,
        );
      const status = await reader.waitForStatus(
        value => !!awaiting(value),
        'delegated flow awaiting a plan was not published',
      );
      const entry = awaiting(status);
      assert(entry);
      const [flowKey] = entry;
      await resolve(reader, flowKey, status, observations);
      return flowKey;
    },
  });
};

const makeContext = async () => {
  const now = Date.now;
  let nonce = 0;
  const makeNonce = () => `plan-observations-a3p-${now()}-${(nonce += 1)}`;

  /** @type {VstorageKit<PortfolioPublishedPathTypes>} */
  const vsc = makeVstorageKit({ fetch: rpcFetch }, LOCAL_CONFIG);

  /** @param {string} address */
  const makeStore = address => {
    const signer = makeSyntheticWalletKit({
      agoric: agoricAmbient,
      address,
      vstorageKit: vsc,
    });
    return makeWalletStoreFromSigner(signer, {
      setTimeout,
      makeNonce,
      log: () => {},
    });
  };

  const bundleId = (await readFile(bundleIdPath, 'utf8')).trim();
  assert(bundleId.startsWith('b1-'));
  /** @type {PortfolioPrivateArgs} */
  const { chainInfo, contracts } = JSON.parse(
    await readFile(privateArgsPath, 'utf8'),
  );
  const control = makeYmaxControlKitForSynthetic(
    { setTimeout },
    {
      signer: makeSyntheticWalletKit({
        agoric: agoricAmbient,
        address: ymax1ControlAddress,
        vstorageKit: vsc,
      }),
      makeNonce,
      log: () => {},
    },
  );
  const { ymax1: instance } = await fromEntriesP(
    vsc.readPublished('agoricNames.instance'),
  );
  const vats = (await getDetailsMatchingVats('ymax1')).filter(
    vat => !vat.terminated,
  );
  assert(vats.length > 0);
  return {
    agd: agdAmbient,
    bundleId,
    chainInfo: harden(chainInfo),
    contracts: harden(contracts),
    control,
    instance,
    makeStore,
    now,
    vatDetails: vats.at(-1),
    vsc,
  };
};

const test = /** @type {TestFn<Awaited<ReturnType<typeof makeContext>>>} */ (
  anyTest
);

test.before(async t => {
  t.context = await makeContext();
});

test.serial('upgrade ymax1 and provision handler and planner', async t => {
  const { agd, bundleId, contracts, control, makeStore, vatDetails, vsc } =
    t.context;
  assert(vatDetails);
  const { postalService: postalServiceInstance } = await fromEntriesP(
    vsc.readPublished('agoricNames.instance'),
  );
  await control.ymaxControl.upgrade({
    bundleId,
    privateArgsOverrides: harden({ contracts, postalServiceInstance }),
  });

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
  const { ymax1, postalService } = await fromEntriesP(
    vsc.readPublished('agoricNames.instance'),
  );
  const addr = {
    handler: await getKeyAddress(agd, 'evmHandler'),
    planner: await getKeyAddress(agd, 'planner'),
  };
  await creatorFacet.deliverEVMWalletHandlerInvitation(
    addr.handler,
    postalService,
  );
  await creatorFacet.deliverPlannerInvitation(addr.planner, postalService);

  await makeStore(addr.handler).saveOfferResult(
    { instance: ymax1, description: 'evmWalletHandler' },
    'evmWalletHandler',
  );
  await makeStore(addr.planner).saveOfferResult(
    { instance: ymax1, description: 'planner' },
    'planner',
  );
});

test.serial('Presley completes the delegated mandate journey', async t => {
  const { agd, chainInfo, contracts, makeStore, now, vsc } = t.context;
  const agentAddress = await getKeyAddress(agd, 'presleyAgent');
  const handlerStore = makeStore(await getKeyAddress(agd, 'evmHandler'));
  /** @type {WalletStoreEntryProxy<EVMWalletMessageHandler>} */
  const handler = handlerStore.get('evmWalletHandler', { sendOnly: true });
  const { ymax1 } = await fromEntriesP(
    vsc.readPublished('agoricNames.instance'),
  );
  const base = contracts.Base;
  const chainId = BigInt(chainInfo.Base.reference);

  // Distinct from the key in lazy-noble-provisioning.test.js: the handler
  // rejects a replayed (wallet, nonce) until its deadline passes, and that
  // test's nonces are an hour from expiring when this one runs.
  const presleyAccount = privateKeyToAccount(
    '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  );
  const presley = makeEvmOwner({
    account: presleyAccount,
    handler,
    base,
    chainId,
    vsc,
    now,
    log: t.log,
  });
  const planner = makePlanner(makeStore(await getKeyAddress(agd, 'planner')));
  const allocations = harden([
    { instrument: 'Aave_Base', portion: 80n },
    { instrument: '@Base', portion: 20n },
  ]);
  /** @type {ExternalPortfolioPermissions} */
  const initialPermissions = harden({
    allocation: {
      instruments: {
        Aave_Base: {
          maxWeightBps: 9_000,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 100,
        },
      },
    },
  });
  const reader = await presley.openPortfolio({
    allocations,
    depositAmount: 1_000_000_000_000n,
    grantee: {
      address: agentAddress,
      permissions: initialPermissions,
    },
  });
  const agentId = 1;
  const agentStatus = await reader.waitForAgents(
    value => value?.[`agent${agentId}`]?.state === 'active',
    'delegation was not published',
  );
  t.deepEqual(agentStatus[`agent${agentId}`].permissions, initialPermissions);

  const presleyAgent = await makeDelegate({
    id: agentId,
    instance: ymax1,
    store: makeStore(agentAddress),
  });

  // Complete the owner-attributed opening deposit flow without observations.
  await planner.completeOpening(reader);

  /** @type {StatusFor['portfolio']} */
  const beforeAccepted = await reader.readStatus();
  await presleyAgent.setTargetAllocation(
    { Aave_Base: 80n, '@Base': 20n },
    beforeAccepted,
    'presley-a3p-accepted',
  );
  const asOf = Math.floor(now() / 1_000);
  const observations = harden({
    // $1m portfolio: 80% in Aave is below 1%, but above 0.5%, of $100m TVL.
    balances: { '@Base': 1_000_000_000_000n },
    balancesAsOf: asOf,
    instrumentTvls: { Aave_Base: { tvlUsd: 100_000_000n, asOf } },
  });
  const acceptedFlow = await planner.resolveDelegatedPlan(
    reader,
    presleyAgent.key,
    observations,
  );
  await reader.waitForFlow(
    acceptedFlow,
    value => value?.state === 'done' && value?.agent === presleyAgent.key,
    'delegated plan with valid observations did not complete',
  );

  /** @type {ExternalPortfolioPermissions} */
  const tighterPermissions = harden({
    allocation: {
      instruments: {
        Aave_Base: {
          maxWeightBps: 9_000,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 50,
        },
      },
    },
  });
  const beforeChange = await reader.readStatus();
  await presley.changePermissions(presleyAgent.id, tighterPermissions);
  const afterChange = await reader.waitForStatus(
    value => value?.policyVersion > beforeChange.policyVersion,
    'permission replacement was not published',
  );
  t.deepEqual(
    (await reader.readAgents())[presleyAgent.key].permissions,
    tighterPermissions,
  );

  await t.throwsAsync(
    presleyAgent.setTargetAllocation(
      { Aave_Base: 80n, '@Base': 20n },
      beforeAccepted,
    ),
    { message: /expected policyVersion/ },
  );

  await presleyAgent.setTargetAllocation(
    { Aave_Base: 80n, '@Base': 20n },
    afterChange,
    'presley-a3p-rejected',
  );
  const rejectedFlow = await planner.resolveDelegatedPlan(
    reader,
    presleyAgent.key,
    observations,
  );
  const failedFlow = await reader.waitForFlow(
    rejectedFlow,
    value => value?.state === 'fail',
    'delegated plan exceeding maximum vault share did not fail',
  );
  t.regex(failedFlow.error, /mandate\.maxVaultShare/);

  await presley.revoke(presleyAgent.id);
  await reader.waitForAgents(
    value => value?.[presleyAgent.key]?.state === 'revoked',
    'revocation was not published',
  );
  /** @type {StatusFor['portfolio']} */
  const afterRevoke = await reader.readStatus();
  await t.throwsAsync(
    presleyAgent.setTargetAllocation(
      { Aave_Base: 60n, '@Base': 40n },
      afterRevoke,
    ),
    { message: /delegation client is not active/ },
  );
});
