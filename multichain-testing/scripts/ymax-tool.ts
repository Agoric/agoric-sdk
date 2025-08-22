#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for integration testing for ymax proof of concept.
 */
import '@endo/init';

import { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  TargetAllocationShape,
  type OfferArgsFor,
  type ProposalType,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makePortfolioSteps } from '@aglocal/portfolio-contract/tools/portfolio-actors.ts';
import type { ContractControl } from '@aglocal/portfolio-deploy/src/contract-control.js';
import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { AmountMath } from '@agoric/ertp';
import {
  multiplyBy,
  parseRatio,
  type ParsableNumber,
} from '@agoric/ertp/src/ratio.js';
import {
  makeTracer,
  mustMatch,
  objectMap,
  type TypedPattern,
} from '@agoric/internal';
import { YieldProtocol } from '@agoric/portfolio-api/src/constants.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { StartedInstanceKit } from '@agoric/zoe/src/zoeService/utils';
import { stringToPath } from '@cosmjs/crypto';
import { fromBech32 } from '@cosmjs/encoding';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, type StdFee } from '@cosmjs/stargate';
import { M } from '@endo/patterns';
import { parseArgs } from 'node:util';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.ts';
import { lookupInterchainInfo } from '@aglocal/portfolio-deploy/src/orch.start.js';
import {
  axelarConfigTestnet,
  gmpAddresses as gmpConfigs,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type { NameHub } from '@agoric/vats';
import { Fail, q } from '@endo/errors';

const getUsage = (
  programName: string,
): string => `USAGE: ${programName} [options]
Options:
  --skip-poll         Skip polling for offer result
  --exit-success      Exit with success code even if errors occur
  --positions         JSON string of opening positions (e.g. '{"USDN":6000,"Aave":4000}')
  --target-allocation JSON string of target allocation (e.g. '{"USDN":6000,"Aave_Arbitrum":4000}')
  --redeem            redeem invitation
  --contract=[ymax0]  agoricNames.instance name of contract that issued invitation
  --description=[planner]
  --submit-for <id>   submit (empty) plan for portfolio <id>
  -h, --help          Show this help message`;

const toAccAddress = (address: string): Uint8Array => {
  return fromBech32(address).data;
};

const trace = makeTracer('YMXTool');
const { fromEntries } = Object;
const { make } = AmountMath;

const AgoricMsgs = {
  MsgWalletSpendAction: {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
    aminoType: 'swingset/WalletSpendAction',
  },
};
const agoricRegistryTypes: [string, GeneratedType][] = [
  [
    AgoricMsgs.MsgWalletSpendAction.typeUrl,
    MsgWalletSpendAction as GeneratedType,
  ],
];

const parseTypedJSON = <T>(
  json: string,
  shape: TypedPattern<T>,
  reviver?: (k, v) => unknown,
  makeError: (err) => unknown = err => err,
): T => {
  let result: unknown;
  try {
    result = harden(JSON.parse(json, reviver));
  } catch (err) {
    throw makeError(err);
  }
  mustMatch(result, shape);
  return result;
};

type GoalData = Partial<Record<YieldProtocol, ParsableNumber>>;
const YieldProtocolShape = M.or(...Object.keys(YieldProtocol));
const ParseableNumberShape = M.or(M.number(), M.string());
const GoalDataShape: TypedPattern<GoalData> = M.recordOf(
  YieldProtocolShape,
  ParseableNumberShape,
);

const openPosition = async (
  goalData: GoalData,
  {
    address,
    client,
    walletKit,
    now,
    targetAllocationJson,
  }: {
    address: string;
    client: SigningStargateClient;
    walletKit: Awaited<ReturnType<typeof makeSmartWalletKit>>;
    now: () => number;
    targetAllocationJson?: string;
  },
) => {
  // XXX PoC26 in devnet published.agoricNames.brand doesn't match vbank
  const brand = fromEntries(
    (await walletKit.readPublished('agoricNames.vbankAsset')).map(([_d, a]) => [
      a.issuerName,
      a.brand,
    ]),
  );
  const { USDC, BLD, PoC26 } = brand as Record<string, Brand<'nat'>>;

  const toAmt = (num: ParsableNumber) =>
    multiplyBy(make(USDC, 1_000_000n), parseRatio(num, USDC));
  const goal = objectMap(goalData, toAmt);
  console.debug('TODO: address Arbitrum-only limitation');
  const evm = 'Ethereum';
  const { give } = makePortfolioSteps(goal, { evm, feeBrand: BLD });
  const proposal: ProposalType['openPortfolio'] = {
    give: {
      ...give,
      ...(PoC26 && { Access: make(PoC26, 1n) }),
    },
  };

  const parseTargetAllocation = () => {
    if (!targetAllocationJson) return undefined;
    const targetAllocation = parseTypedJSON(
      targetAllocationJson,
      TargetAllocationShape,
      (_k, v) => (typeof v === 'number' ? BigInt(v) : v),
      err => Error(`Invalid target allocation JSON: ${err.message}`),
    );
    return harden({ targetAllocation });
  };

  // planner will supply remaining steps
  const steps: MovementDesc[] = [
    { src: '<Deposit>', dest: '+agoric', amount: give.Deposit },
  ];
  const offerArgs: OfferArgsFor['openPortfolio'] = {
    flow: steps,
    ...parseTargetAllocation(),
  };
  trace('opening portfolio', proposal.give);
  const action: BridgeAction = harden({
    method: 'executeOffer',
    offer: {
      id: `open-${new Date(now()).toISOString()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: [['makeOpenPortfolioInvitation']],
      },
      proposal,
      offerArgs,
    },
  });

  const before = await client.getBlock();

  const actual = await signAndBroadcastAction(action, {
    address,
    client,
    walletKit,
  });
  trace('broadcasted tx', actual);

  trace('height', before.header.height, 'looking for offer', action.offer.id);
  const status = await walletKit.pollOffer(
    address,
    action.offer.id,
    before.header.height,
  );

  trace('final offer status', status);
  if ('error' in status) {
    trace('offer failed with error', status.error);
    throw Error(status.error);
  }
  trace('offer completed successfully', {
    statusType: 'success',
    result: status.result,
  });

  return status;
};

const signAndBroadcastAction = async (
  action: BridgeAction,
  {
    address,
    walletKit,
    client,
  }: {
    address: string;
    client: SigningStargateClient;
    walletKit: Awaited<ReturnType<typeof makeSmartWalletKit>>;
  },
) => {
  const msgSpend = MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(address),
    spendAction: JSON.stringify(walletKit.marshaller.toCapData(action)),
  });

  const fee: StdFee = {
    amount: [{ denom: 'ubld', amount: '30000' }], // XXX enough?
    gas: '19700000', // need more when msgSpend.spendAction is large
  };
  console.log('signAndBroadcast', address, msgSpend, fee);
  const actual = await client.signAndBroadcast(
    address,
    [{ typeUrl: MsgWalletSpendAction.typeUrl, value: msgSpend }],
    fee,
  );
  if (actual.code !== 0) {
    throw Error(actual.rawLog);
  }
  trace('tx', actual);
  return actual;
};

const redeemInvitation = async ({
  address,
  client,
  walletKit,
  now,
  contract = 'ymax0',
  description = 'planner',
  saveAs = description.replace(/^deliver /, ''),
}: {
  address: string;
  client: SigningStargateClient;
  walletKit: Awaited<ReturnType<typeof makeSmartWalletKit>>;
  now: () => number;
  contract?: string;
  description?: string;
  saveAs?: string;
}) => {
  const { [contract]: instance } = walletKit.agoricNames.instance;
  // console.error('ymax instance', instance.getBoardId());
  const action: BridgeAction = harden({
    method: 'executeOffer',
    offer: {
      id: `redeem-${new Date(now()).toISOString()}`,
      invitationSpec: {
        source: 'purse',
        instance,
        description,
      },
      proposal: {},
      saveResult: { name: saveAs },
    },
  });

  const before = await client.getBlock();
  console.error('redeem action', action);
  const tx = await signAndBroadcastAction(action, {
    address,
    walletKit,
    client,
  });

  trace('broadcasted tx', tx);

  trace('height', before.header.height, 'looking for offer', action.offer.id);

  const actionUpdate = await retryUntilCondition(
    () => walletKit.readPublished(`wallet.${address}`),
    update =>
      (update.updated === 'offerStatus' &&
        !!(update.status.result || update.status.error)) ||
      update.updated === 'walletAction',
    'redeem offer',
    { setTimeout },
  );

  return { tx, actionUpdate };
};

const buildPrivateArgsOverrides = async (
  walletKit: SmartWalletKit,
  axelarConfig = axelarConfigTestnet,
  gmpAddresses = gmpConfigs.testnet,
) => {
  const byChainId = {};

  const agoricNames: NameHub = harden({
    lookup: async kind => {
      switch (kind) {
        case 'chain':
        case 'chainConnection':
          return harden({
            entries: async () => {
              const out: [string, any][] = [];
              const { vstorage } = walletKit;
              const children = await vstorage.keys(
                `published.agoricNames.${kind}`,
              );
              for (const child of children) {
                // console.debug(kind, child);
                const value = (await walletKit.readPublished(
                  `agoricNames.${kind}.${child}`,
                )) as {};
                console.debug(kind, child, value);
                if (kind === 'chain') {
                  const { chainId, namespace } = value as any;
                  if (namespace !== 'cosmos') {
                    console.warn('namespace?? skipping', kind, child, value);
                    continue;
                  }
                  if (typeof chainId === 'string') {
                    if (chainId in byChainId)
                      throw Error(`oops! ${child} ${chainId}`);
                    byChainId[chainId] = value;
                  }
                }
                out.push([child, value]);
              }
              if (kind === 'chainConnection') {
                return out.filter(([key, _val]) => {
                  const [c1, c2] = key.split('_'); // XXX incomplete
                  return c1 in byChainId && c2 in byChainId;
                });
              }
              return harden(out);
            },
          });
        default:
          return harden({
            entries: async () => {
              // console.debug(kind, 'entries');
              return walletKit.readPublished(`agoricNames.${kind}`) as Promise<
                [[string, any]]
              >;
            },
          });
      }
    },
    entries: () => Fail`not supported`,
    has: () => Fail`not supported`,
    keys: () => Fail`not supported`,
    values: () => Fail`not supported`,
  });
  // build privateArgsOverrides
  const { chainInfo: cosmosChainInfo } = await lookupInterchainInfo(
    agoricNames,
    { agoric: ['ubld'], noble: ['uusdc'], axelar: ['uaxl'] },
  );
  const chainInfo = {
    ...cosmosChainInfo,
    ...Object.fromEntries(
      Object.entries(axelarConfig).map(([chain, info]) => [
        chain,
        info.chainInfo,
      ]),
    ),
  };

  const privateArgsOverrides: Pick<
    Parameters<typeof YMaxStart>[1],
    'axelarIds' | 'chainInfo' | 'contracts' | 'gmpAddresses'
  > = harden({
    axelarIds: objectMap(axelarConfig, c => c.axelarId),
    contracts: objectMap(axelarConfig, c => c.contracts),
    chainInfo,
    gmpAddresses,
  });
  console.log(
    'privateArgsOverrides',
    JSON.stringify(privateArgsOverrides, null, 2),
  );
  return privateArgsOverrides;
};

const installAndStart = async (
  bundleId,
  {
    walletKit,
    ymaxControl,
  }: {
    // TODO: refactor to use reifyWalletStore
    ymaxControl: any;
    walletKit: SmartWalletKit;
  },
) => {
  const issuer = fromEntries(
    await walletKit.readPublished('agoricNames.issuer'),
  );
  const { USDC, BLD } = issuer;

  // work around goofy devnet PoC token
  const vbankAsset = fromEntries(
    await walletKit.readPublished('agoricNames.vbankAsset'),
  );
  const { issuer: Access } = vbankAsset.upoc26;

  const privateArgsOverrides = await buildPrivateArgsOverrides(walletKit);
  await ymaxControl.target.installAndStart({
    bundleId,
    issuers: { USDC, BLD, Fee: BLD, Access },
    privateArgsOverrides,
  });
};

const reifyWalletEntry = <T>(
  targetName: string,
  {
    address,
    client,
    walletKit,
    now,
  }: {
    address: string;
    client: SigningStargateClient;
    walletKit: Awaited<ReturnType<typeof makeSmartWalletKit>>;
    now: () => number;
  },
) => {
  let saveResult;
  const target = new Proxy(
    {},
    {
      get(_target, method, _rx) {
        const impl = async (...args) => {
          const id = now();

          assert.typeof(method, 'string');
          const action: BridgeAction = harden({
            method: 'invokeEntry',
            message: {
              id,
              targetName,
              method,
              args,
              saveResult,
            },
          });

          console.error('submit action', action);
          await signAndBroadcastAction(action, { address, walletKit, client });

          const actionUpdate = await retryUntilCondition(
            () => walletKit.readPublished(`wallet.${address}`),
            update =>
              (update.updated === 'invocation' &&
                update.id === id &&
                (!!update.error || !!update.result)) ||
              update.updated === 'walletAction',
            `invoke ${targetName}`,
            { setTimeout },
          );
          if (actionUpdate.updated === 'invocation' && actionUpdate.error) {
            throw Error(actionUpdate.error);
          }
          trace('invoke:', actionUpdate);
        };
        return impl;
      },
    },
  ) as T;
  const tools = harden({
    setName(name: string, overwrite = false) {
      saveResult = harden({ name, overwrite });
    },
  });
  return { target, tools };
};

type SmartWalletKit = Awaited<ReturnType<typeof makeSmartWalletKit>>;

const noPoll = (wk: SmartWalletKit): SmartWalletKit => ({
  ...wk,
  pollOffer: async () => {
    trace('polling skippped');
    return harden({ status: 'polling skipped' } as any);
  },
});

const parseToolArgs = (argv: string[]) =>
  parseArgs({
    args: argv.slice(2),
    options: {
      positions: { type: 'string', default: '{}' },
      'skip-poll': { type: 'boolean', default: false },
      'exit-success': { type: 'boolean', default: false },
      'target-allocation': { type: 'string' },
      redeem: { type: 'boolean', default: false },
      contract: { type: 'string', default: 'ymax0' },
      description: { type: 'string', default: 'planner' },
      ping: { type: 'boolean', default: false },
      getCreatorFacet: { type: 'boolean', default: false },
      terminate: { type: 'string' },
      installAndStart: { type: 'string' },
      invitePlanner: { type: 'string' },
      'submit-for': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  } = {},
) => {
  const { values } = parseToolArgs(argv);
  const exitSuccess = values['exit-success'];
  const targetAllocationJson = values['target-allocation'];

  if (values.help) {
    console.log(getUsage(argv[1]));
    process.exit(values.help ? 0 : 1);
  }

  const { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(_ => {});
  const now = Date.now;
  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  const walletKit0 = await makeSmartWalletKit({ fetch, delay }, networkConfig);
  const walletKit = values['skip-poll'] ? noPoll(walletKit0) : walletKit0;
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });
  const [{ address }] = await signer.getAccounts();
  const client = await connectWithSigner(networkConfig.rpcAddrs[0], signer, {
    registry: new Registry(agoricRegistryTypes),
  });

  if (values.redeem) {
    await redeemInvitation({
      address,
      walletKit,
      client,
      now,
      contract: values.contract,
      description: values.description,
    });
    return;
  }

  const yc = reifyWalletEntry<ContractControl<typeof YMaxStart>>(
    'ymaxControl',
    {
      address,
      client,
      walletKit,
      now,
    },
  );

  if (values.ping) {
    await yc.target.pruneChainStorage({});
    return;
  }

  if (values.getCreatorFacet) {
    yc.tools.setName('creatorFacet', true);
    await yc.target.getCreatorFacet();
    return;
  }

  if (values.terminate) {
    await yc.target.terminate({ message: values.terminate });
    return;
  }

  if (values.installAndStart) {
    const { installAndStart: bundleId } = values;

    await installAndStart(bundleId, { ymaxControl: yc, walletKit });
    return;
  }

  if (values.invitePlanner) {
    const { invitePlanner: planner } = values;
    const cf = reifyWalletEntry<
      StartedInstanceKit<typeof YMaxStart>['creatorFacet']
    >('creatorFacet', {
      address,
      client,
      walletKit,
      now,
    });
    const { postalService } = walletKit.agoricNames.instance;

    await cf.target.deliverPlannerInvitation(planner, postalService);
    return;
  }

  const { 'submit-for': portfolioId } = values;
  if (portfolioId) {
    const planner = reifyWalletEntry<any>('planner', {
      address,
      client,
      walletKit,
      now,
    });
    await planner.target.submit(portfolioId, []);
    return;
  }

  const positionData = parseTypedJSON(values.positions, GoalDataShape);
  console.debug({ positionData });
  try {
    // Pass the parsed options to openPosition
    await openPosition(positionData, {
      address,
      client,
      walletKit,
      now: Date.now,
      targetAllocationJson,
    });
  } catch (err) {
    // If we should exit with success code, throw a special non-error object
    if (exitSuccess) {
      throw { exitSuccess: true, originalError: err };
    }
    throw err;
  }
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  // Check if this is our special non-error signal for exitSuccess
  if (err && typeof err === 'object' && 'exitSuccess' in err) {
    console.error(
      'Error occurred but exiting with success code as requested:',
      err.originalError,
    );
    process.exit(0);
  }

  console.error(err);
  process.exit(1);
});
