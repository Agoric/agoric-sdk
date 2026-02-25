export interface LockLifecycleEvent {
  key: string;
  lockPath: string;
  type: 'lock-acquired' | 'lock-released';
}

export interface LockWaitingEvent {
  key: string;
  lockPath: string;
  type: 'lock-waiting';
  waitedMs: number;
}

export interface LockBrokenEvent {
  ageMs?: number;
  key: string;
  lockPath: string;
  ownerPid?: number;
  reason: 'dead-owner' | 'stale-age';
  staleLockMs?: number;
  type: 'lock-broken';
}

export type BuildCacheEvent =
  | LockLifecycleEvent
  | LockWaitingEvent
  | LockBrokenEvent;

export interface DirectoryLockPowers {
  acquireTimeoutMs: number;
  delayMs: (ms: number) => Promise<unknown>;
  root: import('@agoric/pola-io').FileRW;
  isPidAlive: (pid: number) => boolean;
  lockRoot: string;
  now: () => number;
  onEvent?: (event: BuildCacheEvent) => void;
  pid: number;
  staleLockMs: number;
}
