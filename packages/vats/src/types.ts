/* eslint-disable no-use-before-define */
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { BridgeIdValue, Remote } from '@agoric/internal';
import type { Bytes } from '@agoric/network';
import type { Guarded } from '@endo/exo';
import type { PacketSDKType } from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import type { LocalChainAccount } from './localchain.js';
import type { TargetApp } from './bridge-target.js';

export type Board = ReturnType<
  ReturnType<typeof import('./lib-board.js').prepareBoardKit>
>['board'];

/**
 * read-only access to a node in a name hierarchy
 *
 * NOTE: We need to return arrays, not iterables, because even if marshal could
 * allow passing a remote iterable, there would be an inordinate number of round
 * trips for the contents of even the simplest nameHub.
 */
export type NameHub<Value = any> = {
  has: (key: string) => boolean;
  /**
   * Look up a path of keys starting from the current NameHub. Wait on any
   * reserved promises.
   */
  lookup: (...path: string[]) => Promise<any>;
  /** get all the entries available in the current NameHub */
  entries: (includeReserved?: boolean) => [string, Value][];
  /** get all names available in the current NameHub */
  keys: () => string[];
  /** get all values available in the current NameHub */
  values: () => Value[];
};

/** write access to a node in a name hierarchy */
export type NameAdmin = {
  provideChild: (key: string, reserved?: string[]) => Promise<NameHubKit>;
  /**
   * Mark a key as reserved; will return a promise that is fulfilled when the
   * key is updated (or rejected when deleted). If the key was already set it
   * does nothing.
   */
  reserve: (key: string) => Promise<void>;
  /**
   * Update if not already updated. Return existing value, or newValue if not
   * existing.
   */
  default: <T>(key: string, newValue: T, newAdmin?: NameAdmin) => T;
  /** Update only if already initialized. Reject if not. */
  set: (key: string, newValue: any, newAdmin?: NameAdmin) => void;
  /**
   * Fulfill an outstanding reserved promise (if any) to the newValue and set
   * the key to the newValue. If newAdmin is provided, set that to return via
   * lookupAdmin.
   */
  update: (key: string, newValue: any, newAdmin?: NameAdmin) => void;
  /**
   * Look up the `newAdmin` from the path of keys starting from the current
   * NameAdmin. Wait on any reserved promises.
   */
  lookupAdmin: (...path: string[]) => Promise<NameAdmin>;
  /** Delete a value and reject an outstanding reserved promise (if any). */
  delete: (key: string) => void;
  /** get the NameHub corresponding to the current NameAdmin */
  readonly: () => NameHub;
  /**
   * Set a function to be called whenever an update or deletion is made, with all the entries as of that point.
   *
   * Note: can be called at most once.
   */
  onUpdate: (fn: undefined | NameHubUpdateHandler) => void;
};

export type NameHubUpdateHandler = {
  /** Called when an update or deletion is made, with all entries as of that point. */
  write: (entries: [string, any][]) => void;
};

/** a node in a name hierarchy */
export type NameHubKit = {
  /** read access */
  nameHub: NameHub;
  /** write access */
  nameAdmin: NameAdmin;
};

export type MyAddressNameAdmin = NameAdmin & {
  getMyAddress(): string;
};
export type NamesByAddressAdmin = NameAdmin & {
  provideChild(
    addr: string,
    reserved?: string[],
  ): Promise<{
    nameHub: NameHub;
    nameAdmin: MyAddressNameAdmin;
  }>;
  lookupAdmin(addr: string): Promise<MyAddressNameAdmin>;
};

/** An object that can receive messages from the bridge device */
export type BridgeHandler = {
  /** Handle an inbound message */
  fromBridge: (obj: any) => Promise<unknown>;
};

export type ScopedBridgeManagerMethods<BridgeId extends BridgeIdValue> = {
  /**
   * Optional bridge ID getter. Not part of the production bridge vat but
   * available in fake bridges as a means for test reflection and for the type
   * system to hang the bridgeId
   */
  getBridgeId?: () => BridgeId;
  /** Downcall from the VM into Golang */
  toBridge: (obj: any) => Promise<any>;
  /** Upcall from Golang into the VM */
  fromBridge: (obj: any) => Promise<unknown>;
  initHandler: (handler: Remote<BridgeHandler>) => void;
  setHandler: (handler: Remote<BridgeHandler>) => void;
};

/** An object which handles messages for a specific bridge */
export type ScopedBridgeManager<BridgeId extends BridgeIdValue> = Guarded<
  ScopedBridgeManagerMethods<BridgeId>
>;

/** The object to manage this bridge */
export type BridgeManager = {
  register: <BridgeId extends BridgeIdValue>(
    bridgeId: BridgeId,
    handler?: Remote<BridgeHandler>,
  ) => ScopedBridgeManager<BridgeId>;
};

export type IBCPortID = string;
export type IBCChannelID = `channel-${number}`;
export type IBCConnectionID = `connection-${number}`;
export type IBCChannelOrdering = 'ORDERED' | 'UNORDERED';

export type IBCPacket = {
  data: Bytes;
  source_channel: IBCChannelID;
  source_port: IBCPortID;
  destination_channel: IBCChannelID;
  destination_port: IBCPortID;
  sequence?: PacketSDKType['sequence'];
  timeout_height?: PacketSDKType['timeout_height'];
  timeout_timestamp?: PacketSDKType['timeout_timestamp'];
};

export type IBCCounterParty = {
  port_id: IBCPortID;
  channel_id: IBCChannelID;
};

export type ConnectingInfo = {
  order: IBCChannelOrdering;
  connectionHops: IBCConnectionID[];
  portID: IBCPortID;
  channelID: IBCChannelID;
  counterparty: IBCCounterParty;
  counterpartyVersion: string;
  version: string;
  asyncVersions?: boolean;
};

/** see [ibc_module.go](../../../golang/cosmos/x/vibc/types/ibc_module.go) */
export type IBCBridgeEvent =
  | 'channelOpenInit'
  | 'channelOpenTry'
  | 'channelOpenAck'
  | 'channelOpenConfirm'
  | 'receivePacket'
  | 'acknowledgementPacket'
  | 'timeoutPacket'
  | 'channelCloseInit'
  | 'channelCloseConfirm'
  | 'sendPacket';

type IBCPacketEvents = {
  channelOpenInit: ConnectingInfo;
  channelOpenTry: ConnectingInfo;
  channelOpenAck: ConnectingInfo;
  channelOpenConfirm: ConnectingInfo;
  receivePacket: {
    packet: IBCPacket;
  };
  acknowledgementPacket: {
    acknowledgement: Bytes;
    packet: IBCPacket;
    relayer: string; // chain address
  };
  timeoutPacket: {
    packet: IBCPacket;
  };
  channelCloseInit: { channelID: IBCChannelID; portID: IBCPortID };
  channelCloseConfirm: { channelID: IBCChannelID; portID: IBCPortID };
  sendPacket: { relativeTimeoutNs: bigint; packet: IBCPacket };
};

export type IBCEvent<E extends IBCBridgeEvent> = {
  type: 'IBC_EVENT';
  blockHeight: number;
  blockTime: number;
  event: E;
} & {
  [K in keyof IBCPacketEvents[E]]: IBCPacketEvents[E][K];
};

/** see [receiver.go](../../../golang/cosmos/x/vibc/types/receiver.go) */
export type IBCDowncallMethod =
  | 'sendPacket'
  | 'tryOpenExecuted'
  | 'receiveExecuted'
  | 'startChannelOpenInit'
  | 'startChannelCloseInit'
  | 'bindPort'
  | 'timeoutExecuted'
  | 'initOpenExecuted';

type IBCMethodEvents = {
  sendPacket: SendPacketDownCall;
  tryOpenExecuted: ChannelOpenAckDowncall;
  receiveExecuted: {}; // TODO update
  startChannelOpenInit: ChannelOpenInitDowncall;
  startChannelCloseInit: {}; // TODO update
  bindPort: { packet: { source_port: IBCPortID } };
  timeoutExecuted: {}; // TODO update
  // XXX why isn't this in receiver.go?
  initOpenExecuted: ChannelOpenAckDowncall;
};

export type IBCMethod<M extends IBCDowncallMethod> = {
  type: 'IBC_METHOD';
  method: M;
} & {
  [K in keyof IBCMethodEvents[M]]: IBCMethodEvents[M][K];
};

export type IBCDowncall<M extends IBCDowncallMethod> = {
  [K in keyof IBCMethodEvents[M]]: IBCMethodEvents[M][K];
};

export type IBCDowncallPacket<M extends IBCDowncallMethod> =
  IBCMethodEvents[M] extends { packet: infer P } ? P : never;

type ChannelOpenDowncallBase = {
  hops: IBCConnectionID[];
  order: IBCChannelOrdering;
  version: string;
};

type ChannelOpenInitDowncall = ChannelOpenDowncallBase & {
  packet: Pick<IBCPacket, 'destination_port' | 'source_port'>;
};

type ChannelOpenAckDowncall = ChannelOpenDowncallBase & {
  packet: Pick<
    IBCPacket,
    | 'destination_port'
    | 'source_port'
    | 'destination_channel'
    | 'source_channel'
  >;
};

type SendPacketDownCall = {
  packet: IBCPacket;
  relativeTimeoutNs: bigint;
};

/**
 * This event is emitted when a FungibleTokenPacket is sent or received
 * by a target (e.g. a {@link LocalChainAccount}) that has a registered
 * {@link TargetApp}. It is passed through the `receiveUpcall` handler.
 */
export type VTransferIBCEvent = {
  type: 'VTRANSFER_IBC_EVENT';
  blockHeight: number;
  blockTime: number;
  /**
   * Indicates the type of IBC packet event:
   * - 'acknowledgementPacket': passive tap that communicates the result of an acknowledged packet
   * - 'writeAcknowledgement': active tap where the receiver can return a write acknowledgement
   */
  event: 'acknowledgementPacket' | 'writeAcknowledgement';
  acknowledgement: Bytes;
  /**
   * Use `JSON.parse(atob(packet.data))` to get a
   * {@link FungibleTokenPacketData} object.
   */
  packet: IBCPacket;
  relayer: string;
  /** e.g. the chain address of the LocalChainAccount */
  target: string;
};
