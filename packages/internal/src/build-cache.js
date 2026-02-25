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
    fs,
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
    await fs.mkdir(lockRoot, { recursive: true });
    const started = now();

    /** @param {string} dpath */
    const mkdirUnlessExists = async dpath => {
      await null; // avoid accidentally catching synchronous exceptions
      try {
        await fs.mkdir(dpath);
        return true;
      } catch (err) {
        const e = /** @type {NodeJS.ErrnoException} */ (err);
        if (e.code === 'EEXIST') {
          return false;
        }
        throw err;
      }
    };

    /** @param {string} fpath */
    const statUnlessMissing = async fpath => {
      await null; // avoid accidentally catching synchronous exceptions
      try {
        return await fs.stat(fpath);
      } catch (err) {
        const e = /** @type {NodeJS.ErrnoException} */ (err);
        if (e.code === 'ENOENT') {
          return undefined;
        }
        throw err;
      }
    };

    const maybeBreakStaleLock = async () => {
      const ownerText = await fs.readFile(ownerPath, 'utf8').catch(() => '');
      if (ownerText) {
        try {
          const ownerInfo = JSON.parse(ownerText);
          if (
            ownerInfo &&
            typeof ownerInfo === 'object' &&
            Number.isInteger(ownerInfo.pid) &&
            !isPidAlive(ownerInfo.pid)
          ) {
            await fs.rm(lockPath, { recursive: true, force: true });
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

      const lockStats = await statUnlessMissing(lockPath);
      if (!lockStats) {
        return true;
      }
      const ageMs = now() - lockStats.mtimeMs;
      if (ageMs >= staleLockMs) {
        await fs.rm(lockPath, { recursive: true, force: true });
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

      return false;
    };

    for (;;) {
      if (await mkdirUnlessExists(lockPath)) {
        await fs.writeFile(
          ownerPath,
          JSON.stringify({ pid, createdAt: now() }),
          'utf8',
        );
        safeEmit({ type: 'lock-acquired', key, lockPath });
        break;
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

    try {
      return await body();
    } finally {
      await fs.rm(lockPath, { recursive: true, force: true });
      safeEmit({ type: 'lock-released', key, lockPath });
    }
  };

  return harden({ withLock });
};
harden(makeDirectoryLock);

let atomicWriteSequence = 0;

/**
 * @param {{
 *   fs: Pick<import('node:fs/promises'), 'rename' | 'writeFile'>;
 *   filePath: string;
 *   data: string;
 *   now: () => number;
 *   pid: number;
 * }} options
 * @throws {NodeJS.ErrnoException} when a unique temp file cannot be created
 *   or the atomic rename fails.
 */
export const writeFileAtomic = async ({ fs, filePath, data, now, pid }) => {
  atomicWriteSequence += 1;
  const tempPath = `${filePath}.${pid}.${now()}.${atomicWriteSequence}.tmp`;
  await fs.writeFile(tempPath, data, { flag: 'wx' });
  await fs.rename(tempPath, filePath);
};
harden(writeFileAtomic);
