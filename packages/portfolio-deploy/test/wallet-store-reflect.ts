import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type {
  SmartWallet,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { EMethods } from '@agoric/vow/src/E.js';
import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import type { ExecutionContext } from 'ava';

/**
 * Reflect wallet store, supporting type-safe invokeEntry
 *
 * @param wallet
 */
export const reflectWalletStore = (
  t: ExecutionContext,
  wallet: SmartWallet,
  addr: string,
  storage,
) => {
  let nonce = 0;

  // XXX should check `published.wallet.${addr}` for updated: 'invocation'
  const watchInvocation = async (id: string | number): Promise<void> => {
    await eventLoopIteration();
    const update = storage
      .getDeserialized(`orchtest.wallet.${addr}`)
      .at(-1) as UpdateRecord;
    assert.equal(update.updated, 'invocation');
    t.is(update.id, id);
    if (update.error) throw t.fail(update.error);
    update.result || Fail`no result for ${id}`;
  };
  // XXX should check `published.wallet.${addr}` for updated: 'offerStatus'
  const watchOffer = async (id: string | number): Promise<void> => {
    await eventLoopIteration();
    for (const update of storage.getDeserialized(
      `orchtest.wallet.${addr}`,
    ) as UpdateRecord[]) {
      if (!(update.updated === 'offerStatus' && update.status.id === id))
        continue;
      const { status } = update;
      if (status.error) throw t.fail(status.error);
      if (status.result) {
        t.pass(`${status.id}`);
        return;
      }
    }
    Fail`offerStatus for ${id} not found`;
  };

  let resultName: string | undefined = undefined;
  const savingResult = async <T>(name: string, thunk: () => Promise<T>) => {
    assert(!resultName, 'already saving');
    resultName = name;
    const result = await thunk();
    resultName = undefined;
    return result;
  };
  const makeEntryProxy = (targetName: string) =>
    new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        if (method === 'then') return undefined;
        const boundMethod = async (...args) => {
          const id = `${method}.${(nonce += 1)}`;
          await E(E(wallet).getInvokeFacet()).invokeEntry({
            id,
            targetName,
            method,
            args,
            ...(resultName ? { saveResult: { name: resultName } } : {}),
          });
          await watchInvocation(id);
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
    await E(E(wallet).getOffersFacet()).executeOffer({
      id,
      invitationSpec: { source: 'purse', description, instance },
      proposal: {},
      saveResult: { name, overwrite: true },
    });
    await watchOffer(id);
    return makeEntryProxy(name) as EMethods<T>;
  };

  const get = <T>(name: string) => makeEntryProxy(name) as EMethods<T>;

  return harden({ get, saveOfferResult, savingResult });
};
