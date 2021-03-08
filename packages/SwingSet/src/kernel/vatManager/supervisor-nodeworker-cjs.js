/* global module require */
// `tap` and `node -r esm` were able to allow the swingset process to create
// a thread (`new Worker()`) from the (ESM) supervisor file without problems,
// but for some reason AVA cannot. The file loaded into the new thread
// appears to lack the effects which `-r esm` had on the rest of the tree.
// This stub, written as CJS, exists to allow the real supervisor to be
// loaded under AVA. With luck, when we switch everything to use real ESM
// modules, and stop using `-r esm`, this should become unnecessary, and
// `controller.js` can point at `nodeWorkerSupervisor.js` instead.

// eslint-disable-next-line no-global-assign
require = require('esm')(module);
module.exports = require('./supervisor-nodeworker');
