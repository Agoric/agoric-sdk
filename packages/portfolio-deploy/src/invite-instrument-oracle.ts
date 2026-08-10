/** @file Deliver, generate, or accept a YMax instrument-oracle invitation. */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import { makeTracer } from '@agoric/internal';
import type { Bech32Address } from '@agoric/orchestration';
import { getControlAddress } from '@agoric/portfolio-api/src/portfolio-constants.js';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils.js';
import { fromBech32 } from '@cosmjs/encoding';
import { encodePubkey, makeAuthInfoBytes } from '@cosmjs/proto-signing';
import { StargateClient } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { parseArgs } from 'node:util';
import type { Details } from 'ses';
import type { FileRW } from '@agoric/pola-io/src/file.js';
import { netOfConfig } from './ymax-admin-helpers.ts';
import {
  makeAgdUnsignedTx,
  makeInstrumentOracleInvitationEncodeObject,
  registry,
} from './ymax-authz-msgs.ts';
import type {
  RunTools,
  SigningSmartWalletKitWithStore,
} from './wallet-admin-types.ts';

const Usage = `invite-instrument-oracle ymax1|ymax0 (--send [--accept] | --generate --to agoric1... --output tx.json | --accept)`;
const INSTRUMENT_ORACLE_KEY = 'instrumentOracle';
type Mode = 'send-and-accept' | 'send-only' | 'generate-only' | 'accept-only';
type YmaxContractName = 'ymax0' | 'ymax1';
type CreatorFacet = ZStarted<typeof YMaxStart>['creatorFacet'];
type ParsedArgs =
  | {
      contract: YmaxContractName;
      mode: 'generate-only';
      oracleAddress: string;
      output: FileRW;
    }
  | {
      contract: YmaxContractName;
      mode: 'send-only';
      oracleAddress: string;
    }
  | {
      contract: YmaxContractName;
      mode: 'send-and-accept' | 'accept-only';
    };

const fee = {
  amount: [{ denom: 'ubld', amount: '75000' }],
  gas: '2500000',
};

function assertYmaxContractName(
  specimen: unknown,
  details?: Details,
): asserts specimen is YmaxContractName {
  assert(specimen === 'ymax0' || specimen === 'ymax1', details);
}

export const parseInstrumentOracleArgs = (
  scriptArgs: string[],
  cwd: FileRW,
): ParsedArgs => {
  const { positionals, values } = parseArgs({
    args: scriptArgs,
    allowPositionals: true,
    options: {
      send: { type: 'boolean', default: false },
      generate: { type: 'boolean', default: false },
      accept: { type: 'boolean', default: false },
      to: { type: 'string' },
      output: { type: 'string' },
    },
  });
  const [contract, ...extra] = positionals;
  assertYmaxContractName(contract, Usage);
  extra.length === 0 || Fail`${Usage}`;
  const { send, generate, accept, to: oracleAddress, output } = values;
  !(send && generate) || Fail`--send and --generate are mutually exclusive`;
  !(generate && accept) || Fail`--generate and --accept are mutually exclusive`;
  const mode: Mode = generate
    ? 'generate-only'
    : send && accept
      ? 'send-and-accept'
      : send
        ? 'send-only'
        : accept
          ? 'accept-only'
          : Fail`${Usage}`;

  if (mode === 'send-only' || mode === 'generate-only') {
    const to = oracleAddress || Fail`--to is required in ${mode} mode`;
    if (mode === 'send-only') {
      !output || Fail`--output is only used with --generate`;
      return { contract, mode, oracleAddress: to };
    }
    const outputPath =
      output || Fail`--output is required in generate-only mode`;
    return {
      contract,
      mode,
      oracleAddress: to,
      output: cwd.join(outputPath),
    };
  }
  !oracleAddress || Fail`--to is not used in ${mode} mode`;
  !output || Fail`--output is only used in generate-only mode`;
  return { contract, mode };
};

const trace = makeTracer('invite-instrument-oracle');

const assertOracleAddress = (address: string): Bech32Address => {
  fromBech32(address).prefix === 'agoric' ||
    Fail`instrument oracle address must use the agoric prefix`;
  return address as Bech32Address;
};

const sendInvitation = async (
  contract: YmaxContractName,
  oracleAddress: Bech32Address,
  { makeAccount, walletKit }: Pick<RunTools, 'makeAccount' | 'walletKit'>,
) => {
  const prefix = contract.toUpperCase();
  const controller = await makeAccount(`${prefix}_CTRL`);
  const creatorFacet = controller.store.get<CreatorFacet>('creatorFacet');
  const { postalService } = walletKit.agoricNames.instance;
  postalService || Fail`missing postalService instance in agoricNames`;
  await creatorFacet.deliverInstrumentOracleInvitation(
    oracleAddress,
    postalService,
  );
  trace.sub(contract)('instrument oracle invitation sent', oracleAddress);
};

const acceptInvitation = async (
  contract: YmaxContractName,
  oracle: SigningSmartWalletKitWithStore,
  walletKit: RunTools['walletKit'],
) => {
  const instance =
    walletKit.agoricNames.instance[contract] ||
    Fail`missing ${contract} instance in agoricNames`;
  await oracle.store.saveOfferResult(
    { instance, description: INSTRUMENT_ORACLE_KEY },
    INSTRUMENT_ORACLE_KEY,
  );
  trace.sub(contract)('instrument oracle invitation accepted', oracle.address);
};

const generateInvitationTx = async (
  contract: YmaxContractName,
  oracleAddress: Bech32Address,
  output: FileRW,
  { walletKit }: Pick<RunTools, 'walletKit'>,
) => {
  const networkConfig = walletKit.networkConfig;
  const net = netOfConfig(networkConfig);
  const controlAddress = getControlAddress(contract, net);
  const rpcAddr = networkConfig.rpcAddrs[0] || Fail`missing RPC address`;
  const queryClient = await StargateClient.connect(rpcAddr);
  const account =
    (await queryClient.getAccount(controlAddress)) ||
    Fail`control account ${controlAddress} not found on chain`;
  const controlPubkey =
    account.pubkey ||
    Fail`control account ${controlAddress} has no public key on chain`;
  const { postalService } = walletKit.agoricNames.instance;
  postalService || Fail`missing postalService instance in agoricNames`;

  const invocationId = `invite-instrument-oracle-${new Date().toISOString()}`;
  const message = makeInstrumentOracleInvitationEncodeObject(
    { oracleAddress, postalService },
    { controlAddress, invocationId, marshaller: walletKit.marshaller },
  );
  const bodyBytes = registry.encodeTxBody({ messages: [message], memo: '' });
  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey: encodePubkey(controlPubkey), sequence: account.sequence }],
    fee.amount,
    Number(fee.gas),
    undefined,
    undefined,
  );
  const unsignedTx = makeAgdUnsignedTx({ bodyBytes, authInfoBytes });
  await output.writeText(`${JSON.stringify(unsignedTx, null, 2)}\n`);
  trace('wrote unsigned control-wallet tx');
  trace(
    'control signer',
    controlAddress,
    'account',
    account.accountNumber,
    'sequence',
    account.sequence,
    'chain',
    networkConfig.chainName,
  );
};

const inviteInstrumentOracle = async (tools: RunTools) => {
  await null;
  const args = parseInstrumentOracleArgs(tools.scriptArgs, tools.cwd);
  const { contract, mode } = args;

  if (mode === 'generate-only') {
    await generateInvitationTx(
      contract,
      assertOracleAddress(args.oracleAddress),
      args.output,
      tools,
    );
    return;
  }

  if (mode === 'send-only') {
    await sendInvitation(
      contract,
      assertOracleAddress(args.oracleAddress),
      tools,
    );
    return;
  }

  const prefix = contract.toUpperCase();
  const oracle = await tools.makeAccount(`${prefix}_INSTRUMENT_ORACLE`);
  if (mode === 'send-and-accept') {
    await sendInvitation(contract, assertOracleAddress(oracle.address), tools);
  }
  await acceptInvitation(contract, oracle, tools.walletKit);
};

export default inviteInstrumentOracle;
