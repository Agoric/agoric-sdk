// @ts-check
import { E } from '@endo/far';
import { ZipReader } from '@endo/zip';
import { encodeBase64, decodeBase64 } from '@endo/base64';

export const installInPieces = async (
  bundle,
  bundler,
  { maxBytesInFlight = 800_000, log = console.log } = {},
) => {
  const { endoZipBase64, ...bundleShell } = bundle;
  const zip = new ZipReader(new Uint8Array(decodeBase64(endoZipBase64)));

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

    log('adding', name, entry.content.length, '...');
    const encodedContent = encodeBase64(entry.content);
    approxBytesInFlight += name.length + encodedContent.length;
    inFlightAdditions.push(E(bundler).add(name, encodedContent));
  }

  log(
    `waiting for ${inFlightAdditions.length} (~${approxBytesInFlight}B) final additions...`,
  );
  await Promise.all(inFlightAdditions);

  log('installing...');
  const installation = await E(bundler).install(bundleShell);

  // console.log({ installation });
  return installation;
};
