// @ts-check
/** @file snippets from the README */

import test from 'ava';

import { agoric } from '../dist/codegen/agoric/bundle.js';

test.failing('Composing Messages', t => {
  // @ts-expect-error
  const { sendPacket } = agoric.vibc.MessageComposer.withTypeUrl;
  t.truthy(sendPacket);
});
