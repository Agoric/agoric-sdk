import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup, type SetupContextWithWallets } from './support.js';
import {
  createFundedWalletAndClient,
  DEFAULT_TIMEOUT_NS,
} from '../tools/ibc-transfer.js';
import { createWallet } from '../tools/wallet.js';
import type { ChainAddress } from '@agoric/orchestration';
import { MsgGrant } from '@agoric/cosmic-proto/cosmos/authz/v1beta1/tx.js';
import { SendAuthorization } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/authz.js';
import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['alice'];

const contractName = 'authzExample';
const contractBuilder =
  '../packages/builders/scripts/orchestration/init-authz-example.js';

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...common, wallets };
  await startContract(contractName, contractBuilder, commonBuilderOpts);
});

test('authz-example', async t => {
  const {
    provisionSmartWallet,
    retryUntilCondition,
    useChain,
    vstorageClient,
    wallets,
  } = t.context;

  const toChainAddress = (
    value: string,
    chainName = 'cosmoshub',
  ): ChainAddress =>
    harden({
      encoding: 'bech32',
      value,
      chainId: useChain(chainName).chain.chain_id,
    });

  // set up "existing account", which will issue MsgGrant
  const keplrAccount = await createFundedWalletAndClient(
    t.log,
    'cosmoshub',
    useChain,
  );
  const keplrAddress = toChainAddress(keplrAccount.address);
  t.log('existing account address', keplrAccount.address);

  // provision agoric smart wallet to submit offers
  // unrelated to wallet above, but we can consider them the same entity
  const wdUser = await provisionSmartWallet(wallets['alice'], {
    BLD: 100n,
    IST: 100n,
  });
  const doOffer = makeDoOffer(wdUser);

  // request an orchestration account
  const offerId = `cosmoshub-makeAccount-${Date.now()}`;
  doOffer({
    id: offerId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeAccount']],
    },
    offerArgs: { chainName: 'cosmoshub' },
    proposal: {},
  });
  const currentWalletRecord = await retryUntilCondition(
    () =>
      vstorageClient.queryData(`published.wallet.${wallets['alice']}.current`),
    ({ offerToPublicSubscriberPaths }) =>
      Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
    `${offerId} continuing invitation is in vstorage`,
  );
  const offerToPublicSubscriberMap = Object.fromEntries(
    currentWalletRecord.offerToPublicSubscriberPaths,
  );
  const address = offerToPublicSubscriberMap[offerId]?.account.split('.').pop();
  t.log('Got orch account address:', address);

  // generate MsgGrant with SendAuthorization for orch account address and broadcast
  const grantMsg = MsgGrant.toProtoMsg({
    grantee: address,
    granter: keplrAddress.value,
    grant: {
      // @ts-expect-error the types don't like this, but i think its right
      authorization: SendAuthorization.toProtoMsg({
        spendLimit: [
          {
            denom: 'uatom',
            amount: '10',
          },
        ],
      }),
      expiration: {
        nanos: 0,
        // TODO calculate something more realistic; this is really far in the future
        seconds: DEFAULT_TIMEOUT_NS,
      },
    },
  });

  const msg = TxBody.encode(
    TxBody.fromPartial({
      messages: [grantMsg],
      // todo, use actual block height
      // timeoutHeight: 9999999999n,
    }),
  ).finish();

  // FIXME, not working. suspicions:
  // 1. MsgExec is not registered in the stargate clients proto registry
  // 2. grantMsg, TxBody, are not formed correctly
  const res = await keplrAccount.client.broadcastTx(msg);
  console.log('res', res);
  t.is(res.code, 0);

  // create a wallet to be our recipient
  const exchangeWallet = await createWallet('cosmos');
  const exchangeAddress = toChainAddress(
    (await exchangeWallet.getAccounts())[0].address,
  );

  // submit MsgExec([MsgSend])
  await doOffer({
    id: `exec-send-${Date.now()}`,
    invitationSpec: {
      source: 'continuing',
      previousOffer: offerId,
      invitationMakerName: 'ExecSend',
      invitationArgs: [
        [{ amount: 10n, denom: 'uatom' }],
        exchangeAddress,
        keplrAddress,
      ],
    },
    proposal: {},
  });

  // TODO verify exchangeAddress balance increases by 10 uatom
});
