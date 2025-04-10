import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, type SetupContext } from '../support.js';
import { createWallet } from '../../tools/wallet.js';
import type { Bech32Address, IBCConnectionInfo } from '@agoric/orchestration';
import { makeQueryClient } from '../../tools/query.js';

const test = anyTest as TestFn<SetupContext>;

test('noble forwarding', async t => {
  const { nobleTools, retryUntilCondition, useChain, vstorageClient } =
    await commonSetup(t, { config: '../config.fusdc.yaml' });

  const agoricWallet = await createWallet('agoric');
  const agoricAddr = (await agoricWallet.getAccounts())[0]
    .address as Bech32Address;
  t.log('Made agoric wallet:', agoricAddr);

  const agoricChainId = useChain('agoric').chain.chain_id;
  const nobleChainId = useChain('noble').chain.chain_id;

  const connInfoPath = `published.agoricNames.chainConnection.${agoricChainId}_${nobleChainId}`;
  const {
    transferChannel: { counterPartyChannelId, channelId },
  }: IBCConnectionInfo = await vstorageClient.queryData(connInfoPath);

  t.regex(
    counterPartyChannelId,
    /^channel-/,
    'counterPartyChannelId retrieved from vstorage',
  );
  t.log(`Found noble->agoric channelId in vstorage: ${counterPartyChannelId}`);

  t.log(
    `Registering forwarding account for ${counterPartyChannelId} ${agoricAddr}...`,
  );
  const registerFwdAcctTx = nobleTools.registerForwardingAcct(
    counterPartyChannelId,
    agoricAddr,
  );
  t.is(registerFwdAcctTx?.code, 0, 'registered forwarding account');
  t.log('Register forwarding account tx:', {
    code: registerFwdAcctTx?.code,
    height: registerFwdAcctTx?.height,
    txhash: registerFwdAcctTx?.txhash,
  });

  const { address: nobleForwardingAddr, exists } =
    nobleTools.queryForwardingAddress(counterPartyChannelId, agoricAddr);
  t.regex(nobleForwardingAddr, /^noble1/, 'noble forwarding address');
  t.true(exists, 'forwarding address exists');
  t.log(`Got forwarding address: ${nobleForwardingAddr}`);

  const qty = 10_000_000n;
  t.log(
    `Initiating mock cctp mint for ${qty} uusdc to ${nobleForwardingAddr}...`,
  );
  const cctpMintTx = nobleTools.mockCctpMint(qty, nobleForwardingAddr);
  t.is(cctpMintTx?.code, 0, 'mocked cctp mint');
  t.log('Mocked CCTP Mint tx:', {
    code: cctpMintTx?.code,
    height: cctpMintTx?.height,
    txhash: cctpMintTx?.txhash,
  });

  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const { balances } = await retryUntilCondition(
    () => queryClient.queryBalances(agoricAddr),
    ({ balances }) => !!balances.length,
    `${agoricAddr} received forwarded funds from noble`,
  );
  t.is(BigInt(balances[0]?.amount), qty, 'got tokens');
  t.log('Received forwarded funds from noble:', balances);

  const { hash: expectedHash } = await queryClient.queryDenom(
    `transfer/${channelId}`,
    'uusdc',
  );
  t.log('Expected denom hash:', expectedHash);

  t.regex(balances[0]?.denom, /^ibc/);
  t.is(
    balances[0]?.denom.split('ibc/')[1],
    expectedHash,
    'got expected ibc denom hash',
  );
});
