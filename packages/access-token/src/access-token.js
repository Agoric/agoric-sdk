// @ts-check
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import path from 'path';

import { openJSONStore } from './json-store.js';

const { freeze: harden } = Object; // IOU

// Adapted from https://stackoverflow.com/a/43866992/14073862
export function generateAccessToken(
  {
    stringBase = /** @type {const} */ ('base64url'),
    byteLength = 48,
    randomBytes,
  } = {
    randomBytes: crypto.randomBytes,
  },
) {
  return new Promise((resolve, reject) =>
    randomBytes(byteLength, (err, buffer) => {
      if (err) {
        reject(err);
      } else if (stringBase === 'base64url') {
        // Convert to url-safe base64.
        const base64 = buffer.toString('base64');
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_');
        resolve(base64url);
      } else {
        resolve(buffer.toString(stringBase));
      }
    }),
  );
}

/**
 * @param {string=} sharedStateDir
 * @param {object} io
 * @param {typeof fs} io.fs
 */
export const makeMyAgoricDir = (
  sharedStateDir = path.join(os.homedir(), '.agoric'),
  { fs: fsSync } = { fs },
) => {
  const {
    promises: { mkdir },
  } = fsSync;
  return harden({
    /**
     * @param {string | number} port
     * @param {object} io
     * @param {typeof import('crypto').randomBytes} io.randomBytes
     */
    getAccessToken: async (
      port,
      { randomBytes } = { randomBytes: crypto.randomBytes },
    ) => {
      if (typeof port === 'string') {
        const match = port.match(/^(.*:)?(\d+)$/);
        if (match) {
          port = match[2];
        }
      }

      // Ensure we're protected with a unique accessToken for this basedir.
      await mkdir(sharedStateDir, { mode: 0o700, recursive: true });

      // TODO: pass fsSync IO access explicitly to makeJSONStore
      // Ensure an access token exists.
      const { storage, commit, close } = openJSONStore(sharedStateDir);
      const accessTokenKey = `accessToken/${port}`;
      const stored = storage.has(accessTokenKey);
      const accessToken = await (stored
        ? storage.get(accessTokenKey)
        : generateAccessToken({ randomBytes }));
      await (stored ||
        (async () => {
          storage.set(accessTokenKey, accessToken);
          await commit();
        })());
      await close();
      return accessToken;
    },
  });
};

/**
 * @param {number|string} port
 * @deprecated use makeMyAgoricDir for OCap Discipline
 */
export async function getAccessToken(port) {
  return makeMyAgoricDir().getAccessToken(port);
}
