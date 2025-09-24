import type { SigningSmartWalletKit } from '@agoric/client-utils';
import { retryUntilCondition, type RetryOptions } from '@agoric/client-utils';
import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { EMethods } from '@agoric/vow/src/E.js';

export const walletUpdates = (
  getLastUpdate: () => Promise<UpdateRecord>,
  retryOpts: RetryOptions & {
    log: (...args: unknown[]) => void;
    setTimeout: typeof globalThis.setTimeout;
  },
) => {
  return harden({
    invocation: async (id: string | number) => {
      const done = (await retryUntilCondition(
        getLastUpdate,
        update =>
          update.updated === 'invocation' &&
          update.id === id &&
          !!(update.result || update.error),
        `${id}`,
        retryOpts,
      )) as UpdateRecord & { updated: 'invocation' };
      if (done.error) throw Error(done.error);
      return done.result;
    },
    offerResult: async (id: string | number) => {
      const done = (await retryUntilCondition(
        getLastUpdate,
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
    log: (...args: unknown[]) => void;
    setTimeout: typeof globalThis.setTimeout;
    fresh: () => number | string;
  },
) => {
  const up = walletUpdates(sig.query.getLastUpdate, retryOpts);

  let saveResult: { name: string; overwrite?: boolean } | undefined = undefined;
  const savingResult = async <T>(name: string, thunk: () => Promise<T>) => {
    assert(!saveResult, 'already saving');
    saveResult = { name, overwrite: true };
    const result = await thunk();
    saveResult = undefined;
    return result;
  };
  let lastTx;
  const logged = (l, x) => {
    retryOpts.log(l, x);
    return x;
  };
  const makeEntryProxy = (targetName: string) =>
    new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        if (method === 'then') return undefined;
        const boundMethod = async (...args) => {
          const id = `${method}.${retryOpts.fresh()}`;
          const message = logged('invoke', {
            id,
            targetName,
            method,
            args,
            ...(saveResult ? { saveResult } : {}),
          });
          const tx = await sig.sendBridgeAction({
            method: 'invokeEntry',
            message,
          });
          if (tx.code !== 0) {
            throw Error(tx.rawLog);
          }
          lastTx = tx;
          await up.invocation(id);
          return saveResult ? makeEntryProxy(saveResult.name) : undefined;
        };
        return harden(boundMethod);
      },
    });

  const saveOfferResult = async <T = unknown>(
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
  ) => {
    const id = `${description}.${retryOpts.fresh()}`;
    // XXX return / expose tx info
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
