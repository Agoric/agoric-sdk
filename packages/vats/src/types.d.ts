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
export type NameHub = {
  has: (key: string) => boolean;
  /**
   * Look up a path of keys starting from the current NameHub. Wait on any
   * reserved promises.
   */
  lookup: (...path: string[]) => Promise<any>;
  /** get all the entries available in the current NameHub */
  entries: (includeReserved?: boolean) => [string, unknown][];
  /** get all names available in the current NameHub */
  keys: () => string[];
  /** get all values available in the current NameHub */
  values: () => unknown[];
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
  set: (key: string, newValue: unknown, newAdmin?: NameAdmin) => void;
  /**
   * Fulfill an outstanding reserved promise (if any) to the newValue and set
   * the key to the newValue. If newAdmin is provided, set that to return via
   * lookupAdmin.
   */
  update: (key: string, newValue: unknown, newAdmin?: NameAdmin) => void;
  /**
   * Look up the `newAdmin` from the path of keys starting from the current
   * NameAdmin. Wait on any reserved promises.
   */
  lookupAdmin: (...path: string[]) => Promise<NameAdmin>;
  /** Delete a value and reject an outstanding reserved promise (if any). */
  delete: (key: string) => void;
  /** get the NameHub corresponding to the current NameAdmin */
  readonly: () => NameHub;
  onUpdate: (fn: undefined | NameHubUpdateHandler) => void;
};

export type NameHubUpdateHandler = {
  write: (entries: [string, unknown][]) => void;
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

/** An object which handles messages for a specific bridge */
export type ScopedBridgeManager = {
  /** Downcall from the VM into Golang */
  toBridge: (obj: any) => Promise<any>;
  /** Upcall from Golang into the VM */
  fromBridge: (obj: any) => Promise<unknown>;
  initHandler: (handler: ERef<BridgeHandler>) => void;
  setHandler: (handler: ERef<BridgeHandler>) => void;
};

/** The object to manage this bridge */
export type BridgeManager = {
  register: (
    bridgeId: string,
    handler?: ERef<BridgeHandler | undefined>,
  ) => ScopedBridgeManager;
};
