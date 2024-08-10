import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';

export const FlowStateShape = M.or(
  'Running',
  'Sleeping',
  'Replaying',
  'Failed',
  'Done',
);

export const PropertyKeyShape = M.or(M.string(), M.symbol());

export const LogEntryShape = M.or(
  // ////////////////////////////// From Host to Guest /////////////////////////
  ['doFulfill', VowShape, M.any()],
  ['doReject', VowShape, M.any()],
  // [
  //   'doCall',
  //   M.remotable('host wrapper of guest target'),
  //   M.opt(PropertyKeyShape),
  //   M.arrayOf(M.any()),
  //   M.number(),
  // ],
  // [
  //   'doSendOnly',
  //   M.or(M.remotable('host wrapper of guest target'), VowShape),
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
  // ['checkFulfill', VowShape, M.any()],
  // ['checkReject', VowShape, M.any()],
  [
    'checkCall',
    M.remotable('host target'),
    M.opt(PropertyKeyShape),
    M.arrayOf(M.any()),
    M.number(),
  ],
  [
    'checkSendOnly',
    M.or(M.remotable('host target'), VowShape),
    M.opt(PropertyKeyShape),
    M.arrayOf(M.any()),
    M.number(),
  ],
  [
    'checkSend',
    M.or(M.remotable('host target'), VowShape),
    M.opt(PropertyKeyShape),
    M.arrayOf(M.any()),
    M.number(),
  ],
  // ['checkReturn', M.number(), M.any()],
  // ['checkThrow', M.number(), M.any()],
);
