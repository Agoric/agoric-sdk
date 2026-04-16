// Detect if this is run as a script.
import url from 'node:url';
import process from 'node:process';

// FIXME: Should maybe be exported by '@endo/something'?
export const isEntrypoint = href =>
  String(href) === url.pathToFileURL(process.argv[1] ?? '/').href;
