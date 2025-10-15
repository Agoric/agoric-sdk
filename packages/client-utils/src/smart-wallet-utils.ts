import { Fail, q } from '@endo/errors';
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import type {
  CurrentWalletRecord,
  UpdateRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { Brand } from '@agoric/ertp/src/types.js';
import type { EReturn } from '@endo/far';
import type { MinimalNetworkConfig } from './network-config.js';
import { retryUntilCondition } from './sync-tools.js';
import type { RetryOptionsAndPowers } from './sync-tools.js';
import { makeAgoricNames, makeVstorageKit } from './vstorage-kit.js';

type UpdateKind = UpdateRecord extends { updated: infer U } ? U : never;
type UpdateOf<K extends UpdateKind> = Extract<UpdateRecord, { updated: K }>;
type OfferStatusUpdate = UpdateOf<'offerStatus'>;
type WalletActionUpdate = UpdateOf<'walletAction'>;
type InvocationUpdate = UpdateOf<'invocation'>;
type CoalescedWalletState = ReturnType<
  typeof makeWalletStateCoalescer
>['state'];

const isOfferStatusUpdate = (
  update: UpdateRecord,
): update is OfferStatusUpdate => update.updated === 'offerStatus';

const isWalletActionUpdate = (
  update: UpdateRecord,
): update is WalletActionUpdate => update.updated === 'walletAction';

const isInvocationUpdate = (update: UpdateRecord): update is InvocationUpdate =>
  update.updated === 'invocation';

// Extract T from a boolean type guard: (arg, ...) => arg is T
type GuardedType<F> = F extends (arg: any) => arg is infer T ? T : never;

const findUpdate = async <F extends (value: UpdateRecord) => boolean>(
  id: string | number,
  getLastUpdate: () => Promise<UpdateRecord>,
  retryOpts: RetryOptionsAndPowers,
  isMatch: F,
): Promise<GuardedType<F>> =>
  // @ts-expect-error TS cannot verify that the return type matches the guarded type
  retryUntilCondition(getLastUpdate, isMatch, `${id}`, retryOpts);

/**
 * Wait for an update indicating settlement of the specified invocation and
 * return its result or throw its error.
 * @alpha
 */
export const getInvocationUpdate = async (
  id: string | number,
  getLastUpdate: () => Promise<UpdateRecord>,
  retryOpts: RetryOptionsAndPowers,
): Promise<InvocationUpdate['result']> => {
  const isMatch = (update: UpdateRecord): update is InvocationUpdate =>
    isInvocationUpdate(update) &&
    update.id === id &&
    Boolean(update.error || update.result);
  const found = await findUpdate(id, getLastUpdate, retryOpts, isMatch);
  if (found.error) {
    throw Error(found.error);
  }
  return found.result;
};
harden(getInvocationUpdate);

/**
 * Wait for an update indicating settlement of the specified offer and return
 * its status or throw its error.
 * Used internally but not yet considered public.
 * @alpha
 */
export const getOfferResult = async (
  id: string | number,
  getLastUpdate: () => Promise<UpdateRecord>,
  retryOpts: RetryOptionsAndPowers,
): Promise<OfferStatus> => {
  const isMatch = (
    update: UpdateRecord,
  ): update is OfferStatusUpdate | WalletActionUpdate =>
    isWalletActionUpdate(update) ||
    (isOfferStatusUpdate(update) &&
      update.status.id === id &&
      Boolean(update.status.error || update.status.result));
  const found = await findUpdate(id, getLastUpdate, retryOpts, isMatch);
  if (!isOfferStatusUpdate(found)) {
    throw Fail`${q(id)} ${q(found.updated)} failure: ${q(found.status?.error)}`;
  }
  const { error, result } = found.status;
  !error || Fail`${q(id)} offerStatus failure: ${q(error)}`;
  result || Fail`${q(id)} offerStatus missing result`;
  return found.status;
};
harden(getOfferResult);

/**
 * Wait for an update indicating untilNumWantsSatisfied of the specified offer
 * and return its status or throw its error.
 * Used internally but not yet considered public.
 * @alpha
 */
export const getOfferWantsSatisfied = async (
  id: string | number,
  getLastUpdate: () => Promise<UpdateRecord>,
  retryOpts: RetryOptionsAndPowers,
): Promise<OfferStatus> => {
  const isMatch = (
    update: UpdateRecord,
  ): update is OfferStatusUpdate | WalletActionUpdate =>
    isWalletActionUpdate(update) ||
    (isOfferStatusUpdate(update) &&
      update.status.id === id &&
      Boolean(update.status.error || 'numWantsSatisfied' in update.status));
  const found = await findUpdate(id, getLastUpdate, retryOpts, isMatch);
  if (!isOfferStatusUpdate(found)) {
    throw Fail`${q(id)} ${q(found.updated)} failure: ${q(found.status?.error)}`;
  }
  const { error, result } = found.status;
  !error || Fail`${q(id)} offerStatus failure: ${q(error)}`;
  result || Fail`${q(id)} offerStatus missing result`;
  return found.status;
};
harden(getOfferWantsSatisfied);

/**
 * Augment VstorageKit with additional convenience methods for working with
 * Agoric smart wallets.
 */
export const makeSmartWalletKit = async (
  {
    fetch,
    delay: _delay,
    names = true,
  }: {
    fetch: typeof globalThis.fetch;
    delay: (ms: number) => Promise<void>;
    names?: boolean;
  },
  networkConfig: MinimalNetworkConfig,
) => {
  const vsk = makeVstorageKit({ fetch }, networkConfig);

  type AgoricNames = Awaited<ReturnType<typeof makeAgoricNames>>;
  const agoricNames: AgoricNames = await (names
    ? makeAgoricNames(vsk.fromBoard, vsk.vstorage)
    : ({} as AgoricNames));

  // @ts-expect-error XXX BoardRemote
  const invitationBrand = (agoricNames.brand?.Invitation ??
    Fail`missing Invitation brand`) as Brand<'set'>;

  const storedWalletState = async (
    from: string,
    minHeight: number | string | undefined = undefined,
  ): Promise<CoalescedWalletState> => {
    const history = await vsk.vstorage.readFully(
      `published.wallet.${from}`,
      minHeight,
    );

    const coalescer = makeWalletStateCoalescer(invitationBrand);
    // update with oldest first
    for (const txt of [...history].reverse()) {
      const { body, slots } = JSON.parse(txt) as {
        body: string;
        slots: string[];
      };
      const record = vsk.marshaller.fromCapData({
        body,
        slots,
      }) as UpdateRecord;
      coalescer.update(record);
    }

    const coalesced = coalescer.state;
    harden(coalesced);
    return coalesced;
  };

  const pollOffer = async (
    from: string,
    id: string | number,
    _minHeight?: number | string,
    untilNumWantsSatisfied = false,
  ): Promise<OfferStatus> => {
    const getAddrLastUpdate = () => getLastUpdate(from);
    const retryOpts: RetryOptionsAndPowers = {
      setTimeout: globalThis.setTimeout,
    };
    return untilNumWantsSatisfied
      ? getOfferWantsSatisfied(id, getAddrLastUpdate, retryOpts)
      : getOfferResult(id, getAddrLastUpdate, retryOpts);
  };

  const getLastUpdate = (addr: string): Promise<UpdateRecord> =>
    vsk.readPublished(`wallet.${addr}`) as Promise<UpdateRecord>;

  const getCurrentWalletRecord = (addr: string): Promise<CurrentWalletRecord> =>
    vsk.readPublished(`wallet.${addr}.current`) as Promise<CurrentWalletRecord>;

  return {
    // pass along all of VstorageKit
    ...vsk,
    agoricNames,
    getLastUpdate,
    getCurrentWalletRecord,
    storedWalletState,
    pollOffer,
  };
};

export type SmartWalletKit = EReturn<typeof makeSmartWalletKit>;
