#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for integration testing for ymax proof of concept.
 */
import '@endo/init';

import { fetchNetworkConfig, makeSmartWalletKit } from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { AmountMath } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { makeTracer } from '@agoric/internal';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { fromBech32 } from '@cosmjs/encoding';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, type StdFee } from '@cosmjs/stargate';
import { stringToPath } from '@cosmjs/crypto';

const toAccAddress = (address: string): Uint8Array => {
  return fromBech32(address).data;
};

const trace = makeTracer('YMXTool');
const { fromEntries, values } = Object;
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

const openPosition = async (
  volume: number | string,
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
  const brand = fromEntries(await walletKit.readPublished('agoricNames.brand'));
  const { USDC } = brand as Record<string, Brand<'nat'>>;

  const give = {
    USDN: multiplyBy(make(USDC, 1_000_000n), parseRatio(volume, USDC)),
  };

  trace('opening portfolio', give);
  const action: BridgeAction = harden({
    method: 'executeOffer',
    offer: {
      id: `open-${now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: [['makeOpenPortfolioInvitation']],
      },
      proposal: { give },
    },
  });

  const msgSpend = MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(address),
    spendAction: JSON.stringify(walletKit.marshaller.toCapData(action)),
  });

  const fee: StdFee = {
    amount: [{ denom: 'ubld', amount: '30000' }], // XXX enough?
    gas: '197000',
  };
  const before = await client.getBlock();
  console.log('signAndBroadcast', address, msgSpend, fee);
  const actual = await client.signAndBroadcast(
    address,
    [{ typeUrl: MsgWalletSpendAction.typeUrl, value: msgSpend }],
    fee,
  );
  trace('tx', actual);

  const status = await walletKit.pollOffer(
    address,
    action.offer.id,
    before.header.height,
  );
  trace('status', status);
  return status;
};

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  } = {},
) => {
  const [volume] = argv.slice(2);
  if (!volume) throw Error(`USAGE: ${argv[1]} 123.45`);
  const { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(_ => {});
  const networkConfig = await fetchNetworkConfig('devnet', { fetch });
  const walletKit = await makeSmartWalletKit({ fetch, delay }, networkConfig);
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });
  const [{ address }] = await signer.getAccounts();
  const client = await connectWithSigner(networkConfig.rpcAddrs[0], signer, {
    registry: new Registry(agoricRegistryTypes),
  });
  await openPosition(volume, { address, client, walletKit, now: Date.now });
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  console.error(err);
  process.exit(1);
});
