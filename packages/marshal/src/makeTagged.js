// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { assert, details as X } from '@agoric/assert';
import { PASS_STYLE } from './helpers/passStyle-helpers.js';
import { passStyleOf } from './passStyleOf.js';

const { create, prototype: objectPrototype } = Object;

const makeTaggedMaker = style =>
  harden((tag, payload) => {
    assert.typeof(
      tag,
      'string',
      X`The tag of a tagged record must be a string: ${tag}`,
    );
    passStyleOf(harden(payload)); // assert that it, hardened, is passable
    return harden(
      create(objectPrototype, {
        [PASS_STYLE]: { value: style },
        [Symbol.toStringTag]: { value: tag },
        payload: { value: payload, enumerable: true },
      }),
    );
  });

export const makeCopyTagged = makeTaggedMaker('copyTagged');
export const makeMetaTagged = makeTaggedMaker('metaTagged');
