// @ts-check
/** @file snippets from the README */

import test from 'ava';

import { agoric } from '../dist/codegen/agoric/bundle.js';

test.failing('Composing Messages', t => {
  // @ts-expect-error
  const { installBundle } = agoric.swingset.MessageComposer.withTypeUrl;
  t.truthy(installBundle);
});
