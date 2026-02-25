/* eslint-env node */
import path from 'node:path';

/**
 * @import {BuildCacheEvent, DirectoryLockPowers} from './build-cache-types.js';
 */

/**
 * @param {DirectoryLockPowers} powers
 */
export const makeDirectoryLock = powers => {
  const {
    root,
    delayMs,
    now,
    pid,
    isPidAlive,
    lockRoot,
    staleLockMs,
    acquireTimeoutMs,
    onEvent = () => {},
  } = powers;
  const safeEmit = event => {
    try {
      onEvent(event);
    } catch {
      // Event sinks are observational; lock behavior must not depend on them.
    }
  };

  /**
   * @param {string} key
   * @param {() => Promise<any>} body
   */
  const withLock = async (key, body) => {
    const lockPath = path.join(lockRoot, `${encodeURIComponent(key)}.lock`);
    const ownerPath = path.join(lockPath, 'owner.json');
    await root.join(lockRoot).mkdir({ recursive: true });
    const started = now();

    const maybeBreakStaleLock = async () => {
      const ownerText = await root
        .join(ownerPath)
        .readOnly()
        .readText()
        .catch(() => '');
      if (ownerText) {
        try {
          const ownerInfo = JSON.parse(ownerText);
          if (
            ownerInfo &&
            typeof ownerInfo === 'object' &&
            Number.isInteger(ownerInfo.pid) &&
            !isPidAlive(ownerInfo.pid)
          ) {
            await root.join(lockPath).rm({ recursive: true, force: true });
            safeEmit({
              type: 'lock-broken',
              key,
              lockPath,
              reason: 'dead-owner',
              ownerPid: ownerInfo.pid,
            });
            return true;
          }
        } catch {
          // rely on age-based lock breaking for malformed owner files
        }
      }

      try {
        const lockStats = await root.join(lockPath).readOnly().stat();
        const ageMs = now() - lockStats.mtimeMs;
        if (ageMs >= staleLockMs) {
          await root.join(lockPath).rm({ recursive: true, force: true });
          safeEmit({
            type: 'lock-broken',
            key,
            lockPath,
            reason: 'stale-age',
            ageMs,
            staleLockMs,
          });
          return true;
        }
      } catch {
        return true;
      }

      return false;
    };

    for (;;) {
      try {
        await root.join(lockPath).mkdir({ recursive: false });
        await root
          .join(ownerPath)
          .writeText(JSON.stringify({ pid, createdAt: now() }));
        safeEmit({ type: 'lock-acquired', key, lockPath });
        break;
      } catch (err) {
        const e = /** @type {NodeJS.ErrnoException} */ (err);
        if (e.code !== 'EEXIST') {
          throw err;
        }
        const recovered = await maybeBreakStaleLock();
        if (recovered) {
          continue;
        }
        const waitedMs = now() - started;
        safeEmit({ type: 'lock-waiting', key, lockPath, waitedMs });
        if (waitedMs >= acquireTimeoutMs) {
          throw Error(`Timed out waiting for cache lock ${lockPath}`);
        }
        await delayMs(20);
      }
    }

    try {
      return await body();
    } finally {
      await root.join(lockPath).rm({ recursive: true, force: true });
      safeEmit({ type: 'lock-released', key, lockPath });
    }
  };

  return harden({ withLock });
};
harden(makeDirectoryLock);
