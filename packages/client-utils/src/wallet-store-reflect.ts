import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { EMethods } from '@agoric/vow/src/E.js';
import type { SigningSmartWalletKit } from './signing-smart-wallet-kit.ts';
import { retryUntilCondition, type RetryOptions } from './sync-tools.js';

export const walletUpdates = (
  getLastUpdate: () => Promise<UpdateRecord>,
  retryOpts: RetryOptions & {
    log: (...args: any[]) => void;
    setTimeout: typeof globalThis.setTimeout;
  },
) => {
  return harden({
    invocation: async (id: string | number) => {
      const done = (await retryUntilCondition(
        () => getLastUpdate(),
        update =>
          update.updated === 'invocation' &&
          update.id === id &&
          (!!update.result || !!update.error),
        `${id}`,
        retryOpts,
      )) as UpdateRecord & { updated: 'invocation' };
      if (done.error) throw Error(done.error);
      return done.result;
    },
    offerResult: async (id: string | number) => {
      const done = (await retryUntilCondition(
        () => getLastUpdate(),
        update =>
          update.updated === 'offerStatus' &&
          update.status.id === id &&
          (!!update.status.result || !!update.status.error),
        `${id}`,
        retryOpts,
      )) as UpdateRecord & { updated: 'offerStatus' };
      if (done.status.error) throw Error(done.status.error);
      return done.status.result;
    },
    // payoutAmounts: ...
  });
};

/**
 * Reflect wallet store, supporting type-safe invokeEntry
 *
 * @param wallet
 */
export const reflectWalletStore = (
  sig: SigningSmartWalletKit,
  retryOpts: RetryOptions & {
    log: (...args: any[]) => void;
    setTimeout: typeof globalThis.setTimeout;
  },
) => {
  let nonce = 0;

  const up = walletUpdates(sig.query.getLastUpdate, retryOpts);

  let resultName: string | undefined = undefined;
  const savingResult = async <T>(name: string, thunk: () => Promise<T>) => {
    assert(!resultName, 'already saving');
    resultName = name;
    const result = await thunk();
    resultName = undefined;
    return result;
  };
  let lastTx;
  const makeEntryProxy = (targetName: string) =>
    new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        if (method === 'then') return undefined;
        const boundMethod = async (...args) => {
          const id = `${method}.${(nonce += 1)}`;
          let tx = await sig.invokeEntry({
            id,
            targetName,
            method,
            args,
            ...(resultName ? { saveResult: { name: resultName } } : {}),
          });
          lastTx = tx.result.transaction;
          await up.invocation(id);
          return resultName ? makeEntryProxy(resultName) : undefined;
        };
        return harden(boundMethod);
      },
    });

  const saveOfferResult = async <T = unknown>(
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
  ) => {
    const id = `${description}.${(nonce += 1)}`;
    await sig.sendBridgeAction(
      harden({
        method: 'executeOffer',
        offer: {
          id,
          invitationSpec: { source: 'purse', description, instance },
          proposal: {},
          saveResult: { name, overwrite: true },
        },
      }),
    );
    await up.offerResult(id);
    return makeEntryProxy(name) as EMethods<T>;
  };

  const get = <T>(name: string) => makeEntryProxy(name) as EMethods<T>;

  return harden({
    get,
    saveOfferResult,
    savingResult,
    getLastTx: () => lastTx,
  });
};
