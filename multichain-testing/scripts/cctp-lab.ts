#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file verify CCTP mintRecipient encoding by sending
 * a burn transaction to noble and verifying that
 * it results in a CCTP attestation.
 *
 * Noble source address, signature is based on $MNEMONIC.
 * Set $CCTP_DEST to a CAIP-10 accountId such as eip155:58008:0x3dA3050... ...
 */
import '@endo/init';

import { MsgDepositForBurn } from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import type { NobleAddress } from '@agoric/fast-usdc';
import {
  accountIdTo32Bytes,
  parseAccountId,
} from '@agoric/orchestration/src/utils/address.js';
import { keccak256 } from '@cosmjs/crypto';
import { fromBase64, toHex } from '@cosmjs/encoding';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import type { AccountId } from '@agoric/orchestration';

export const cctpTypes: ReadonlyArray<[string, GeneratedType]> = [
  [
    '/circle.cctp.v1.MsgDepositForBurn',
    // @ts-expect-error type of encode doesn't match. not sure why
    MsgDepositForBurn,
  ],
];

const configs = {
  test: {
    circle: {
      iris: 'https://iris-api-sandbox.circle.com',
    },
    noble: {
      explorer: 'https://mintscan.io/noble-testnet',
      rpc: 'https://noble-testnet-rpc.polkachu.com:443',
      api: 'https://noble-testnet-api.polkachu.com:443',
    },
    dest: {
      eth: {
        explorer: 'https://sepolia.etherscan.io',
        chainRef: 'eip155:58008',
        domain: 0,
      },
      solana: {
        chainRef: 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K',
        domain: 5,
      },
    },
  },
  main: {
    circle: {
      iris: 'https://iris-api.circle.com',
    },
    noble: {
      explorer: 'https://mintscan.io/noble',
      rpc: 'https://noble-rpc.polkachu.com:443',
    },
    dest: {
      eth: {
        explorer: 'https://etherscan.io',
        chainRef: 'eip155:1',
        domain: 0,
      },
    },
  },
};
const config = configs.test;

const fee1 = {
  amount: [{ denom: 'uusdc', amount: '0' }],
  gas: '200000',
};

const makeBurnMsg = (from: NobleAddress, destId: string, amount = 1n) => {
  // parseAccountId is defensive; can handle string
  const dest = parseAccountId(destId as AccountId);
  const mintRecipient = accountIdTo32Bytes(destId as AccountId);
  const destInfo = Object.values(config.dest).find(
    info => info.chainRef === `${dest.namespace}:${dest.reference}`,
  );
  if (!destInfo)
    throw Error(`unsupported: ${dest.namespace}:${dest.reference}`);
  const msg = {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
    value: {
      from,
      amount: `${amount}` as `${number}`,
      destinationDomain: destInfo.domain,
      mintRecipient,
      burnToken: 'uusdc' as const,
      // If using DepositForBurnWithCaller, add destinationCaller here
    },
  };

  return msg;
};

/**
 * @see {@link https://docs.noble.xyz/cctp/manual_relaying#fetching-attestation-from-circle}
 *
 * @param tx DepositForBurn transaction (from API)
 */
const attestationKey = tx => {
  const { events } = tx.tx_response;
  const sent = events.find(e => e.type === 'circle.cctp.v1.MessageSent');
  const message64: string = JSON.parse(
    sent.attributes.find(a => a.key === 'message').value,
  );
  const message = fromBase64(message64);
  const hash = keccak256(message);
  return `0x${toHex(hash)}`;
};

const makePoll = (setTimeout: typeof globalThis.setTimeout, period = 2_000) => {
  async function* poll<T>(thunk: () => Promise<{ done: boolean; value: T }>) {
    for (;;) {
      const step = await thunk();
      yield step.value;
      if (step.done) break;
      await new Promise(resolve => setTimeout(resolve, period));
    }
  }
  return poll;
};

const main = async ({
  env: { MNEMONIC, CCTP_DEST } = process.env,
  connectWithSigner = SigningStargateClient.connectWithSigner,
  fetch = globalThis.fetch,
  setTimeout = globalThis.setTimeout,
} = {}) => {
  const fetchJSON = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw Error(res.statusText);
    return res.json();
  };

  const makeNobleClient = async (mnemonic: string) => {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'noble',
    });
    const [{ address }] = await wallet.getAccounts();
    console.log('source addr:', address);
    assert(address.startsWith('noble1'));
    const clientOpts = { registry: new Registry(cctpTypes) };
    const client = await connectWithSigner(
      config.noble.rpc,
      wallet,
      clientOpts,
    );
    const api = async (path: string) => fetchJSON(`${config.noble.api}${path}`);
    return { address: address as NobleAddress, client, api };
  };

  const { client, address, api } = await makeNobleClient(MNEMONIC!);

  const dest = CCTP_DEST!;
  console.log('minting on:', dest);

  const burn = makeBurnMsg(address, dest);
  console.log('broadcasting', burn, MsgDepositForBurn.toProtoMsg(burn.value));
  const txResp = await client.signAndBroadcast(address, [burn], fee1);
  console.log(
    `Burned on Noble: ${config.noble.explorer}/tx/${txResp.transactionHash}`,
  );

  const tx = await api(`/cosmos/tx/v1beta1/txs/${txResp.transactionHash}`);

  const key = attestationKey(tx);
  console.log('GET attestation', `${config.circle.iris}/attestations/${key}`);
  const iris = (path: string) => fetchJSON(`${config.circle.iris}${path}`);
  const tryGetAttestation = async () => {
    try {
      const current = await iris(`/attestations/${key}`);
      return { done: current.status === 'complete', value: current };
    } catch (e) {
      return { done: false, value: e };
    }
  };
  for await (const x of makePoll(setTimeout)(tryGetAttestation)) {
    if (x instanceof Error && x.message === 'Not Found') continue;
    console.log('attestation?', x);
  }
};

main().catch(err => console.error(err));
