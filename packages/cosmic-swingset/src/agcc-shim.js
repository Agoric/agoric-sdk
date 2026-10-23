// @ts-check
import { Fail } from '@endo/errors';

/**
 * The bridge shared by the native Cosmos binding and the external VM adapter.
 * See ../docs/vm-bridge.md and golang/cosmos/src/agcosmosdaemon-node.cc.
 *
 * @typedef {{ resolve: (result: string) => void, reject: (reason: string) => void }} AgoricReplier
 * @typedef {(port: number, messageJSON: string, replier: AgoricReplier) => void} AgoricMessageHandler
 *   Receives a Go action asynchronously on the JS main thread. Settle its
 *   replier once; repeated settlement is ignored. Go actions address the chain
 *   handler at node port 1, which the JS chain handler asserts.
 * @typedef {{ handleError?: (error: string) => string }} AgoricSendOptions
 * @typedef {{ send: (port: number, messageJSON: string, opts?: AgoricSendOptions) => string }} AgoricSender
 *   Sends to a positive logical Go service port and synchronously returns its
 *   response. Go service errors default to JSON error responses in both adapters;
 *   a per-call handleError can return a replacement string or throw instead.
 *   malformed replies and local protocol failures throw.
 * @typedef {{ start: (handleMessage: AgoricMessageHandler, argv: string[]) => AgoricSender }} AgoricBridge
 *   Start once with the daemon argv including argv[0]. Only the returned facet
 *   can send. Native mode launches Go with argv; external mode validates argv
 *   as startup metadata, since the parent Go process has already consumed it.
 */

// Node's fs API accepts nonnegative signed 32-bit file descriptors. This is a
// bound on the bridge contract, not a claim about every POSIX shell's FD limit.
export const MAX_FILE_DESCRIPTOR = 2 ** 31 - 1;

/** @param {number} fd */
export const assertFileDescriptor = fd => {
  (Number.isInteger(fd) && fd >= 0 && fd <= MAX_FILE_DESCRIPTOR) ||
    Fail`file descriptor ${fd} must be an integer from 0 to ${MAX_FILE_DESCRIPTOR}`;
};

/**
 * @param {{ AGVM_INPUT_FD?: string, AGVM_OUTPUT_FD?: string }} env
 * @param {{
 *   loadNative: () => Promise<AgoricBridge>,
 *   makeExternal: (inputFd: number, outputFd: number) => AgoricBridge,
 * }} loaders
 * @returns {Promise<AgoricBridge>}
 */
export const loadAgcc = async (env, { loadNative, makeExternal }) => {
  const { AGVM_INPUT_FD: input, AGVM_OUTPUT_FD: output } = env;
  if (input === undefined && output === undefined) return loadNative();
  if (input === undefined || output === undefined) {
    throw Fail`AGVM_INPUT_FD and AGVM_OUTPUT_FD must be specified together`;
  }
  /** @param {string} value */
  const parseFd = value => {
    /^[0-9]+$/.test(value) || Fail`invalid file descriptor ${value}`;
    const fd = Number(value);
    assertFileDescriptor(fd);
    return fd;
  };
  return makeExternal(parseFd(input), parseFd(output));
};
