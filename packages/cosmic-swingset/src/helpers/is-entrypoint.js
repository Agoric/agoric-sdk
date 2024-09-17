// @jessie-check

// Detect if this is run as a script.
import process from 'process';
import url from 'url';

// FIXME: Should maybe be exported by '@endo/something'?
export const isEntrypoint = href =>
  String(href) === url.pathToFileURL(process.argv[1] ?? '/').href;
