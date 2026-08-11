// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { getPermitWitnessTransferFromData } from '@agoric/orchestration/src/utils/permit2.ts';
import { recoverTypedDataAddress } from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { portfolioPermissionsToEIP712 } from '@agoric/portfolio-api/src/portfolio-permissions.js';
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
import { isDeepStrictEqual } from 'node:util';
import { privateKeyToAccount } from 'viem/accounts';
import { makeSyntheticWalletKit } from '../synthetic-wallet-kit.js';

/**
 * @import {EVMWalletMessageHandler} from '@aglocal/portfolio-contract/src/evm-wallet-handler.exo.ts';
 * @import {InstrumentOracle} from '@aglocal/portfolio-contract/src/instrument-oracle.exo.ts';
 * @import {PortfolioDelegationClient} from '@aglocal/portfolio-contract/src/delegation.exo.ts';
 * @import {ExternalPortfolioPermissions, StatusFor} from '@agoric/portfolio-api';
 * @import {WalletStoreEntryProxy} from '@agoric/client-utils/src/wallet-store.ts';
 * @import {TestFn} from 'ava';
 */

const ymax1ControlAddress = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';
const bundleIdPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/dist/ymax0.bundleId';
const privateArgsPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/test/privateArgs-ymax1.json';
const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const fromPublishedEntries = async path =>
  Object.fromEntries(await vsc.readPublished(path));

let nonce = 0;
const makeNonce = () => `instrument-oracle-a3p-${Date.now()}-${(nonce += 1)}`;

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

const eventuallyRead = async (path, expected) => {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const value = await vsc.readPublished(path);
      if (isDeepStrictEqual(value, expected)) {
        return value;
      }
      lastError = Error(`published value at ${path} has not caught up`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw lastError;
};

const eventuallyReadWhere = async (path, predicate, description) => {
  let lastValue;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      lastValue = await vsc.readPublished(path);
      if (predicate(lastValue)) return lastValue;
    } catch {
      // The path may not have been published yet.
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw Error(`${description}; last value: ${String(lastValue)}`);
};

const presleyAccount = privateKeyToAccount(
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
);

const signMessage = async message => {
  const signed = harden({
    ...message,
    signature: await presleyAccount.signTypedData(message),
  });
  const verifiedSigner = await recoverTypedDataAddress(signed);
  assert(verifiedSigner === presleyAccount.address);
  return harden({ ...signed, verifiedSigner });
};

const makeContext = async () => {
  const bundleId = (await readFile(bundleIdPath, 'utf8')).trim();
  assert(bundleId.startsWith('b1-'));
  const { chainInfo, contracts } = JSON.parse(
    await readFile(privateArgsPath, 'utf8'),
  );

  const controlSigner = makeSyntheticWalletKit({
    address: ymax1ControlAddress,
    vstorageKit: vsc,
  });
  const control = makeYmaxControlKitForSynthetic(
    { setTimeout },
    { signer: controlSigner, makeNonce, log: () => {} },
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

test.before(async t => {
  t.context = await makeContext();
});

test.serial('upgrade ymax1 and provision policy capabilities', async t => {
  const { bundleId, contracts, control, instance, vatDetails } = t.context;
  assert(vatDetails);

  const { postalService: postalServiceInstance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  await control.ymaxControl.upgrade({
    bundleId,
    privateArgsOverrides: harden({
      contracts,
      postalServiceInstance,
    }),
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

  const oracleAddress = getKeyAddress('instrumentOracle');
  const handlerAddress = getKeyAddress('evmHandler');
  const { ymax1, postalService } = await fromPublishedEntries(
    'agoricNames.instance',
  );

  await creatorFacet.deliverInstrumentOracleInvitation(
    oracleAddress,
    postalService,
  );
  await creatorFacet.deliverEVMWalletHandlerInvitation(
    handlerAddress,
    postalService,
  );

  const oracleStore = makeStore(oracleAddress);
  await oracleStore.saveOfferResult(
    { instance: ymax1, description: 'instrumentOracle' },
    'instrumentOracle',
  );
  /** @type {WalletStoreEntryProxy<InstrumentOracle>} */
  const oracle = oracleStore.get('instrumentOracle');

  const handlerStore = makeStore(handlerAddress);
  await handlerStore.saveOfferResult(
    { instance: ymax1, description: 'evmWalletHandler' },
    'evmWalletHandler',
  );

  await oracle.submitTvlUpdate('Aave_Base', 12_345_679n, 1_786_123_456);
  await oracle.submitTvlUpdate('Aave_Base', 12_600_000n, 1_786_123_516);

  const expected = {
    tvlUsd: 12_600_000n,
    asOf: 1_786_123_516,
  };
  t.deepEqual(
    await eventuallyRead('ymax1.instruments.Aave_Base', expected),
    expected,
  );
});

test.serial('Presley delegates, changes mandate, and revokes', async t => {
  const { chainInfo, contracts } = t.context;
  const agentAddress = getKeyAddress('presleyAgent');
  const handlerAddress = getKeyAddress('evmHandler');
  const handlerStore = makeStore(handlerAddress);
  /** @type {WalletStoreEntryProxy<EVMWalletMessageHandler>} */
  const handler = handlerStore.get('evmWalletHandler', { sendOnly: true });
  const { ymax1 } = await fromPublishedEntries('agoricNames.instance');
  const base = contracts.Base;
  const chainId = BigInt(chainInfo.Base.reference);
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
  const deadline = BigInt(Math.floor(Date.now() / 1_000) + 3_600);
  const witness = getYmaxWitness('OpenPortfolio', {
    allocations,
    grantee: {
      address: agentAddress,
      permissions: portfolioPermissionsToEIP712(initialPermissions),
    },
  });
  const openMessage = getPermitWitnessTransferFromData(
    {
      permitted: { token: base.usdc, amount: 1_000_000n },
      spender: base.depositFactory,
      nonce: 1n,
      deadline,
    },
    base.permit2,
    chainId,
    witness,
  );
  await handler.handleMessage(await signMessage(openMessage));

  const walletPath = `ymax1.evmWallets.${presleyAccount.address}`;
  const openStatus = await eventuallyReadWhere(
    walletPath,
    value => value?.status === 'ok' && typeof value.result === 'string',
    'signed open+grant did not succeed',
  );
  const portfolioKey = openStatus.result;
  t.regex(portfolioKey, /^portfolio\d+$/);
  const portfolioPath = `ymax1.portfolios.${portfolioKey}`;
  const agentsPath = `${portfolioPath}.agents`;

  t.deepEqual(
    await eventuallyReadWhere(
      agentsPath,
      value => value?.agent1?.state === 'active',
      'delegation was not published',
    ),
    {
      agent1: {
        grantee: agentAddress,
        permissions: initialPermissions,
        state: 'active',
        updatedAtPolicyVersion: 1,
      },
    },
  );

  const agentStore = makeStore(agentAddress);
  await agentStore.saveOfferResult(
    { instance: ymax1, description: 'portfolioMandate' },
    'portfolioMandate',
  );
  /** @type {WalletStoreEntryProxy<PortfolioDelegationClient>} */
  const delegation = agentStore.get('portfolioMandate');
  /** @type {StatusFor['portfolio']} */
  const beforeAccepted = await vsc.readPublished(portfolioPath);
  const acceptedSyncState = harden({
    policyVersion: beforeAccepted.policyVersion,
    rebalanceCount: beforeAccepted.rebalanceCount,
  });
  await delegation.setTargetAllocation(
    harden({
      targetAllocation: {
        Aave_Base: 80n,
        '@Base': 20n,
      },
      syncState: acceptedSyncState,
      agentMemo: 'presley-a3p',
    }),
  );

  const afterAccepted = await eventuallyReadWhere(
    portfolioPath,
    value => value?.flowCount > beforeAccepted.flowCount,
    'delegated allocation did not start a flow',
  );
  t.true(
    Object.values(afterAccepted.flowsRunning || {}).some(
      flow =>
        flow.agent === 'agent1' &&
        flow.policyVersion === acceptedSyncState.policyVersion,
    ),
  );

  /** @type {ExternalPortfolioPermissions} */
  const tighterPermissions = harden({
    allocation: {
      instruments: {
        Aave_Base: {
          maxWeightBps: 7_000,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 50,
        },
      },
    },
  });
  const changeMessage = getYmaxStandaloneOperationData(
    {
      agentId: 1n,
      permissions: portfolioPermissionsToEIP712(tighterPermissions),
      portfolio: BigInt(portfolioKey.replace('portfolio', '')),
      nonce: 2n,
      deadline,
    },
    'ChangePermissions',
    chainId,
    base.depositFactory,
  );
  await handler.handleMessage(await signMessage(changeMessage));
  const afterChange = await eventuallyReadWhere(
    portfolioPath,
    value => value?.policyVersion > acceptedSyncState.policyVersion,
    'permission replacement was not published',
  );
  const changedAgents = /** @type {StatusFor['portfolioAgents']} */ (
    await vsc.readPublished(agentsPath)
  );
  t.deepEqual(changedAgents.agent1.permissions, tighterPermissions);

  await t.throwsAsync(
    delegation.setTargetAllocation(
      harden({
        targetAllocation: { Aave_Base: 80n, '@Base': 20n },
        syncState: acceptedSyncState,
      }),
    ),
    { message: /expected policyVersion/ },
  );

  const currentSyncState = harden({
    policyVersion: afterChange.policyVersion,
    rebalanceCount: afterChange.rebalanceCount,
  });
  await t.throwsAsync(
    delegation.setTargetAllocation(
      harden({
        targetAllocation: { Aave_Base: 80n, '@Base': 20n },
        syncState: currentSyncState,
      }),
    ),
    { message: /mandate\.maxWeight/ },
  );
  const afterRejections = /** @type {StatusFor['portfolio']} */ (
    await vsc.readPublished(portfolioPath)
  );
  t.is(afterRejections.flowCount, afterChange.flowCount);

  const revokeMessage = getYmaxStandaloneOperationData(
    {
      agentId: 1n,
      portfolio: BigInt(portfolioKey.replace('portfolio', '')),
      nonce: 3n,
      deadline,
    },
    'Revoke',
    chainId,
    base.depositFactory,
  );
  await handler.handleMessage(await signMessage(revokeMessage));
  await eventuallyReadWhere(
    agentsPath,
    value => value?.agent1?.state === 'revoked',
    'revocation was not published',
  );
  const afterRevoke = /** @type {StatusFor['portfolio']} */ (
    await vsc.readPublished(portfolioPath)
  );
  await t.throwsAsync(
    delegation.setTargetAllocation(
      harden({
        targetAllocation: { Aave_Base: 60n, '@Base': 40n },
        syncState: {
          policyVersion: afterRevoke.policyVersion,
          rebalanceCount: afterRevoke.rebalanceCount,
        },
      }),
    ),
    { message: /delegation client is not active/ },
  );
});

test.serial('instrument-oracle revocation remains effective', async t => {
  const { control } = t.context;
  const { result: creatorFacet } =
    await control.ymaxControl.getCreatorFacet.once({
      saveAs: 'creatorFacet',
      overwrite: true,
    })();
  assert(creatorFacet);
  const oracleStore = makeStore(getKeyAddress('instrumentOracle'));
  /** @type {WalletStoreEntryProxy<InstrumentOracle>} */
  const oracle = oracleStore.get('instrumentOracle');

  await creatorFacet.revokeInstrumentOracle();
  await t.throwsAsync(
    oracle.submitTvlUpdate('Aave_Base', 12_700_000n, 1_786_123_576),
    { message: /revoked/ },
  );
});
