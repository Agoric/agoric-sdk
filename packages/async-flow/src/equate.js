import { Fail, X, annotateError, q } from '@endo/errors';
import { throwLabeled } from '@endo/common/throw-labeled.js';
import { getTag, isObject, passStyleOf } from '@endo/pass-style';
import { recordNames } from '@endo/marshal';
import { isVow } from '@agoric/vow/src/vow-utils.js';

const { is } = Object;

export const makeEquate = bijection => {
  const equate = (g, h, label) => {
    // Open code the synchronous part of applyLabelingError, because
    // we need to preserve returned promise identity.
    // TODO switch to Richard Gibson's suggestion for a better way
    // to keep track of the error labeling.
    if (label === undefined) {
      // eslint-disable-next-line no-use-before-define
      innerEquate(g, h);
    }
    try {
      // eslint-disable-next-line no-use-before-define
      innerEquate(g, h);
    } catch (err) {
      throwLabeled(err, label);
    }
  };

  const innerEquate = (g, h) => {
    if (!isObject(g)) {
      is(g, h) ||
        // separate line so I can set a breakpoint
        Fail`unequal ${g} vs ${h}`;
      return;
    }
    if (bijection.hasGuest(g) && bijection.guestToHost(g) === h) {
      // Note that this can be true even when
      // `bijection.hostToGuest(h) !== g`
      // but only when the two guests represent the same host, as
      // happens with unwrapping. That why we do this one-way test
      // rather than the two way `bijection.has` test.
      // Even in this one-way case, we have still satisfied
      // the equate, so return.
      return;
    }
    const gPassStyle = passStyleOf(g);
    if (gPassStyle === 'promise' && isVow(h)) {
      // Important special case, because vows have passStyle 'tagged'.
      // However, we do not yet support passing guest promise to host.
      // TODO when we do, delete the `throw Fail` line and uncomment
      // the two lines below it.
      // We *do* support passing a guest wrapper of a hostVow back
      // to the host, but that would be caught by `bijection.guestToHost`
      // test above.
      throw Fail`guest promises not yet passable`;
      // `init` does not yet do enough checking anyway. For this case,
      // we should ensure that h is a host wrapper of a guest promise,
      // which is a wrapping we don't yet support.
      // bijection.unwrapInit(g, h);
      // return;
    }
    const hPassStyle = passStyleOf(h);
    gPassStyle === hPassStyle ||
      Fail`unequal passStyles ${q(gPassStyle)} vs ${q(hPassStyle)}`;
    switch (gPassStyle) {
      case 'copyArray': {
        equate(g.length, h.length, 'length');
        // eslint-disable-next-line github/array-foreach
        g.forEach((gEl, i) => equate(gEl, h[i], i));
        return;
      }
      case 'copyRecord': {
        const gNames = recordNames(g);
        const hNames = recordNames(h);
        equate(gNames, hNames, 'propertyNames');
        for (const name of gNames) {
          equate(g[name], h[name], name);
        }
        return;
      }
      case 'tagged': {
        equate(getTag(g), getTag(h), 'tag');
        equate(g.payload, h.payload, 'payload');
        return;
      }
      case 'error': {
        equate(g.name, h.name, 'error name');
        // For errors, all that needs to agree on replay is the `name`
        // property. All others can differ. That's because everything else
        // is assumed to be diagnostic info useful to programmers, which
        // we'd like to improve over time. No programmatic use of additional
        // error diagnostic info other than to better inform developers.
        // A program should not take a semantically significant branch
        // based on any of this diagnostic info, aside from `name`.
        //
        // Error annotations are not observable outside the console output,
        // so this does not breach membrane isolation.
        annotateError(g, X`replay of error ${h}`);
        annotateError(h, X`replayed as error ${g}`);
        return;
      }
      case 'remotable': {
        // Note that we can send a guest wrapping of a host remotable
        // back to the host,
        // but that should have already been caught by the
        // `bijection.guestToHost` above.
        throw Fail`cannot yet send guest remotables to host ${g} vs ${h}`;
        // `unwrapInit` does not yet do enough checking anyway. For this case,
        // we should ensure that h is a host wrapper of a guest remotable,
        // which is a wrapping we don't yet support.
        // bijection.unwrapInit(g, h);
        // return;
      }
      case 'promise': {
        // Note that we can send a guest wrapping of a host promise
        // (or vow) back to the host,
        // but that should have already been caught by the
        // `bijection.guestToHost` above.
        throw Fail`cannot yet send guest promises to host ${g} vs ${h}`;
        // `unwrapInit` does not yet do enough checking anyway. For this case,
        // we should ensure that h is a host wrapper of a guest promise,
        // which is a wrapping we don't yet support.
        // bijection.unwrapInit(g, h);
        // return;
      }
      default: {
        throw Fail`unexpected passStyle ${q(gPassStyle)}`;
      }
    }
  };
  return harden(equate);
};
harden(makeEquate);
