// @ts-check
import { E } from '@endo/far';
import { ZipReader } from '@endo/zip';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import crypto from 'crypto';

const computeSha512 = bytes => {
  const hash = crypto.createHash('sha512');
  hash.update(bytes);
  return hash.digest().toString('hex');
};

export const installInPieces = async (
  bundle,
  bundlerOrGetter,
  { maxBytesInFlight = 800_000, log = console.log, persist = false } = {},
) => {
  const bundler =
    typeof bundlerOrGetter === 'function' ? bundlerOrGetter() : bundlerOrGetter;

  // It would be nice to detect evaluation errors early like this:
  //   await importBundle(bundle, { endowments });
  // but importBundle only works inside SwingSet; checking here
  // may run into stuff like VatData not being available.
  const { endoZipBase64, ...bundleShell } = bundle;
  const zip = new ZipReader(new Uint8Array(decodeBase64(endoZipBase64)));

  const candidates = [];
  for await (const [_name, entry] of zip.files.entries()) {
    const hash = computeSha512(entry.content);
    candidates.push(hash);
  }
  const preloaded = await E(bundler).preFilter(candidates);
  log('preloaded', preloaded.length, 'out of', candidates.length);
  const preloadSet = new Set(preloaded);

  let approxBytesInFlight = 0;
  let inFlightAdditions = [];
  for await (const [name, entry] of zip.files.entries()) {
    if (approxBytesInFlight >= maxBytesInFlight) {
      log(
        `waiting for ${inFlightAdditions.length} (~${approxBytesInFlight}B) additions...`,
      );
      await Promise.all(inFlightAdditions);
      approxBytesInFlight = 0;
      inFlightAdditions = [];
    }

    const hash = computeSha512(entry.content);
    if (preloadSet.has(hash)) {
      // log('preloaded', name, entry.content.length, '...');
      approxBytesInFlight += name.length + hash.length;
      inFlightAdditions.push(E(bundler).addByRef(name, hash));
    } else {
      log('adding', name, entry.content.length, '...');
      const encodedContent = encodeBase64(entry.content);
      approxBytesInFlight += name.length + encodedContent.length;
      inFlightAdditions.push(E(bundler).add(name, encodedContent, hash));
    }
  }

  log(
    `waiting for ${inFlightAdditions.length} (~${approxBytesInFlight}B) final additions...`,
  );
  await Promise.all(inFlightAdditions);

  await (persist && E(bundler).persist());

  log('installing...');
  const installation = await E(bundler).install(bundleShell);

  // console.log({ installation });
  return installation;
};
