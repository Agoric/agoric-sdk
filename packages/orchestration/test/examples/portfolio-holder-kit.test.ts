import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeCopyMap } from '@endo/patterns';
import { Far } from '@endo/far';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { commonSetup } from '../supports.js';
import { preparePortfolioHolder } from '../../src/examples/stake-it/portfolio-holder-kit.js';
import { prepareMakeTestLOAKit } from '../exos/make-test-loa-kit.js';
import { prepareMakeTestCOAKit } from '../exos/make-test-coa-kit.js';

test('portfolio holder kit behaviors', async t => {
  const { bootstrap } = await commonSetup(t);
  const { rootZone, storage, vowTools } = bootstrap;
  const storageNode = storage.rootNode.makeChildNode('accounts');

  /**
   * mock zcf that echos back the offer description
   */
  const mockZcf = Far('MockZCF', {
    /** @type {ZCF['makeInvitation']} */
    makeInvitation: (offerHandler, description, ..._rest) => {
      t.is(typeof offerHandler, 'function');
      const p = new Promise(resolve => resolve(description));
      return p;
    },
  });

  const makeTestCOAKit = prepareMakeTestCOAKit(t, bootstrap, { zcf: mockZcf });
  const makeTestLOAKit = prepareMakeTestLOAKit(t, bootstrap, { zcf: mockZcf });
  const makeCosmosAccount = async ({
    chainId,
    hostConnectionId,
    controllerConnectionId,
  }) => {
    return makeTestCOAKit({
      storageNode,
      chainId,
      hostConnectionId,
      controllerConnectionId,
    });
  };

  const makeLocalAccount = async () => {
    return makeTestLOAKit({ storageNode });
  };

  const accounts = {
    cosmoshub: await makeCosmosAccount({
      chainId: 'cosmoshub-99',
      hostConnectionId: 'connection-0' as const,
      controllerConnectionId: 'connection-1' as const,
    }),
    agoric: await makeLocalAccount(),
  };
  const accountMap = makeCopyMap(Object.entries(accounts));

  const makePortfolioHolderKit = preparePortfolioHolder(
    rootZone.subZone('portfolio'),
    vowTools,
  );
  const publicTopics = await Promise.all(
    Object.entries(accounts).map(async ([chainName, holder]) => {
      const { account } = await E(holder).getPublicTopics();
      return [chainName, account];
    }),
  );
  // @ts-expect-error type mismatch between kit and OrchestrationAccountI
  const holder = makePortfolioHolderKit(accountMap, publicTopics);

  const cosmosAccount = await E(holder).getAccount('cosmoshub');
  t.is(
    cosmosAccount,
    // @ts-expect-error type mismatch between kit and OrchestrationAccountI
    accounts.cosmoshub,
    'same account holder kit provided is returned',
  );

  const { invitationMakers } = await E(holder).asContinuingOffer();

  const delegateInv = await E(invitationMakers).Action(
    'cosmoshub',
    'Delegate',
    [
      harden({
        address: 'cosmos1valoper',
        chainId: 'cosmoshub-99',
        addressEncoding: 'bech32',
      }),
      harden({
        denom: 'uatom',
        value: 10n,
      }),
    ],
  );

  // note: mocked zcf (we are not in a contract) returns inv description
  // @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'Vow<any>'
  t.is(delegateInv, 'Delegate', 'any invitation maker accessible via Action');

  const osmosisAccount = await makeCosmosAccount({
    chainId: 'osmosis-99',
    hostConnectionId: 'connection-2' as const,
    controllerConnectionId: 'connection-3' as const,
  });

  const osmosisTopic = (await E(osmosisAccount).getPublicTopics()).account;

  // @ts-expect-error type mismatch between kit and OrchestrationAccountI
  await E(holder).addAccount('osmosis', osmosisAccount, osmosisTopic);

  t.is(
    await E(holder).getAccount('osmosis'),
    // @ts-expect-error type mismatch between kit and OrchestrationAccountI
    osmosisAccount,
    'new accounts can be added',
  );

  t.snapshot(await E(holder).getPublicTopics(), 'public topics');
});
