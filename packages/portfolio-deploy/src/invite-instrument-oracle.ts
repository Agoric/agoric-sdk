/** @file Generate an unsigned control-wallet tx that delivers an instrument-oracle invitation. */
import { makeTracer } from '@agoric/internal';
import type { Bech32Address } from '@agoric/orchestration';
import { getControlAddress } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { fromBech32 } from '@cosmjs/encoding';
import { encodePubkey, makeAuthInfoBytes } from '@cosmjs/proto-signing';
import { StargateClient } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import type { Details } from 'ses';
import { netOfConfig } from './ymax-admin-helpers.ts';
import {
  makeAgdUnsignedTx,
  makeInstrumentOracleInvitationEncodeObject,
  registry,
} from './ymax-authz-msgs.ts';
import type { RunTools } from './wallet-admin-types.ts';

const Usage = `invite-instrument-oracle ymax1|ymax0 agoric1... [output.json]`;
const fee = {
  amount: [{ denom: 'ubld', amount: '75000' }],
  gas: '2500000',
};
type YmaxContractName = 'ymax0' | 'ymax1';

function assertYmaxContractName(
  specimen: unknown,
  details?: Details,
): asserts specimen is YmaxContractName {
  assert(specimen === 'ymax0' || specimen === 'ymax1', details);
}

const trace = makeTracer('invite-instrument-oracle');

const generateInstrumentOracleInvitation = async ({
  scriptArgs,
  walletKit,
  cwd,
}: RunTools) => {
  const [contract, oracleAddress, outputArg] = scriptArgs;
  assertYmaxContractName(contract, Usage);
  oracleAddress || Fail`${Usage}`;
  fromBech32(oracleAddress).prefix === 'agoric' ||
    Fail`instrument oracle address must use the agoric prefix`;

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
    {
      oracleAddress: oracleAddress as Bech32Address,
      postalService,
    },
    {
      controlAddress,
      invocationId,
      marshaller: walletKit.marshaller,
    },
  );
  const bodyBytes = registry.encodeTxBody({ messages: [message], memo: '' });
  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey: encodePubkey(controlPubkey), sequence: account.sequence }],
    fee.amount,
    Number(fee.gas),
    undefined,
    undefined,
  );
  const output = outputArg || `${contract}-instrument-oracle-unsigned-tx.json`;
  const unsignedTx = makeAgdUnsignedTx({ bodyBytes, authInfoBytes });
  await cwd.join(output).writeText(`${JSON.stringify(unsignedTx, null, 2)}\n`);
  trace('wrote unsigned control-wallet tx', output);
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

export default generateInstrumentOracleInvitation;
