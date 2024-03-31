import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';

export const PropertyKeyShape = M.or(M.string(), M.symbol());

export const HostVowShape = M.or(VowShape, M.promise());

export const LogEntryShape = M.or(
  // ////////////////////////////// From Host to Guest /////////////////////////
  ['doFulfill', HostVowShape, M.any()],
  ['doReject', HostVowShape, M.any()],
  // [
  //   'doCall',
  //   M.remotable('host wrapper of guest target'),
  //   M.opt(PropertyKeyShape),
  //   M.arrayOf(M.any()),
  //   M.number(),
  // ],
  // [
  //   'doSend',
  //   M.or(M.remotable('host wrapper of guest target'), VowShape),
  //   M.opt(PropertyKeyShape),
  //   M.arrayOf(M.any()),
  //   M.number(),
  // ],
  ['doReturn', M.number(), M.any()],
  ['doThrow', M.number(), M.any()],

  // ////////////////////////////// From Guest to Host /////////////////////////
  // ['checkFulfill', HostVowShape, M.any()],
  // ['checkReject', HostVowShape, M.any()],
  [
    'checkCall',
    M.remotable('host target'),
    M.opt(PropertyKeyShape),
    M.arrayOf(M.any()),
    M.number(),
  ],
  // [
  //   'checkSend',
  //   M.or(M.remotable('host target'), VowShape),
  //   M.opt(PropertyKeyShape),
  //   M.arrayOf(M.any()),
  //   M.number(),
  // ],
  // ['checkReturn', M.number(), M.any()],
  // ['checkThrow', M.number(), M.any()],
);
