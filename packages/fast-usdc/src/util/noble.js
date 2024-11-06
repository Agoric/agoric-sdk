import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { AminoTypes, SigningStargateClient } from '@cosmjs/stargate';
import { nobleAminoConverters, nobleProtoRegistry } from '@nick134-bit/noblejs';
import axios from 'axios';

const createMsgRegisterAccount = (
  /** @type {string} */ signer,
  /** @type {string} */ recipient,
  /** @type {string} */ channel,
) => {
  return {
    typeUrl: '/noble.forwarding.v1.MsgRegisterAccount',
    value: {
      signer,
      recipient,
      channel,
    },
  };
};

export const registerFwdAccount = async (
  /** @type {string} */ nobleSeed,
  /** @type {string} */ nobleToAgoricChannel,
  /** @type {string} */ nobleRpc,
  /** @type {string} */ recipient,
  out = console,
) => {
  out.log('registering fwd account on noble');
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(nobleSeed, {
    prefix: 'noble',
  });
  out.log('got noble wallet from seed');
  const accounts = await wallet.getAccounts();
  const signerAddress = accounts[0].address;
  out.log(`got signer ${signerAddress}`);
  const msg = createMsgRegisterAccount(
    signerAddress,
    recipient,
    nobleToAgoricChannel,
  );
  const fee = {
    amount: [
      {
        denom: 'uusdc',
        amount: '20000',
      },
    ],
    gas: '200000',
  };
  out.log('signing message', msg);
  const clientWithSigner = await SigningStargateClient.connectWithSigner(
    nobleRpc,
    wallet,
    {
      aminoTypes: new AminoTypes({
        ...nobleAminoConverters,
      }),
      registry: new Registry([...nobleProtoRegistry]),
    },
  );
  const txResult = await clientWithSigner.signAndBroadcast(
    signerAddress,
    [msg],
    fee,
    'Register Account Transaction',
  );

  if (txResult.code !== undefined && txResult.code !== 0) {
    throw new Error(
      `Transaction failed with code ${txResult.code}: ${txResult.events || ''}`,
    );
  }
  return `Transaction successful with hash: ${txResult.transactionHash}`;
};

export const queryForwardingAccount = async (
  /** @type {string} */ nobleApi,
  /** @type {string} */ nobleToAgoricChannel,
  /** @type {string} */ agoricAddr,
  out = console,
  get = axios.get,
) => {
  const query = `${nobleApi}/noble/forwarding/v1/address/${nobleToAgoricChannel}/${agoricAddr}`;
  out.log(`querying forward address details from noble api: ${query}`);
  let forwardingAddressRes;
  await null;
  try {
    forwardingAddressRes = await get(query);
  } catch (e) {
    out.error(`Error querying forwarding address from ${query}`);
    throw e;
  }
  const { address, exists } = forwardingAddressRes.data;
  out.log(
    `got forwarding address details: ${JSON.stringify(forwardingAddressRes.data)}`,
  );
  return { address, exists };
};
