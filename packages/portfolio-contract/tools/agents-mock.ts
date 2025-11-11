import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type {
  SmartWallet,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { EMethods } from '@agoric/vow/src/E.js';
import { E } from '@endo/far';
import type { PortfolioPlanner } from '../src/planner.exo.js';
import type { start as startYMax } from '../src/portfolio.contract.js';

const reflectWalletStore = (
  wallet: SmartWallet,
  {
    fresh,
    getLastUpdate,
  }: {
    fresh: () => number | string;
    getLastUpdate: () => Promise<UpdateRecord>;
  },
) => {
  const invokeP = E(wallet).getInvokeFacet();

  const makeEntryProxy = (targetName: string) =>
    new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        if (method === 'then') return undefined;
        const boundMethod = async (...args) => {
          const id = `${method}.${fresh()}`;
          const message = { id, targetName, method, args };
          await E(invokeP).invokeEntry(message);
          await eventLoopIteration();
          const update = await getLastUpdate();
          assert.equal(update.updated, 'invocation', 'limited mock');
          assert.equal(update.id, id, 'limited mock');
          if (update.error) throw Error(update.error);
        };
        return harden(boundMethod);
      },
    });

  const offersP = E(wallet).getOffersFacet();

  const saveOfferResult = async <T = unknown>(
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
  ) => {
    const id = `${description}.${fresh()}`;

    await E(offersP).executeOffer({
      id,
      invitationSpec: { source: 'purse', instance, description },
      proposal: {},
      saveResult: { name, overwrite: true },
    });

    const done = await getLastUpdate();
    switch (done.updated) {
      case 'walletAction':
        throw Error(`walletAction failure: ${done.status.error}`);
      case 'offerStatus':
        if (done.status.error) {
          throw Error(`offerStatus failure: ${done.status.error}`);
        }
        if (!done.status.result) {
          throw Error(`offerStatus missing result`);
        }
        break;
      default:
        throw Error(`unexpected update type ${done.updated}`);
    }

    return makeEntryProxy(name) as EMethods<T>;
  };

  const get = <T>(name: string) => makeEntryProxy(name) as EMethods<T>;
  return harden({ get, saveOfferResult });
};

export const plannerClientMock = (
  wallet: SmartWallet,
  instance: Instance<typeof startYMax>,
  getLastUpdate: () => Promise<UpdateRecord>,
) => {
  let nonce = 0;
  const fresh = () => (nonce += 1);
  const walletStore = reflectWalletStore(wallet, { fresh, getLastUpdate });

  const redeem = async () => {
    await walletStore.saveOfferResult({ instance, description: 'planner' });
  };

  const stub = walletStore.get<PortfolioPlanner>('planner');

  return harden({
    redeem,
    get stub() {
      assert(nonce > 0); // redeemed
      return stub;
    },
  });
};
