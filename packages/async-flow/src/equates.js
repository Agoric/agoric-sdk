import { Fail, X, annotateError, q } from '@endo/errors';
import { throwLabeled } from '@endo/common/throw-labeled.js';
import { getTag, isPrimitive, passStyleOf } from '@endo/pass-style';
import { recordNames } from '@endo/marshal';
import { isVow } from '@agoric/vow/src/vow-utils.js';

/**
 * TODO We should be able to at-import `Rejectior` but for an undiagnosed
 * reason we cannot. So we just locally reproduce the defining typedef.
 * at-import {Rejector} from '@endo/errors/rejector.js';
 * @typedef {false | typeof Fail} Rejector
 *
 * @import {Guest, Host} from './types.ts';
 */

const { is } = Object;

export const makeEquatesKit = bijection => {
  const confirmEquates = makeConfirmEquates(bijection);

  /**
   * If `equates` returns `true`, then g and h have been equated.
   * Otherwise, there are two ways `equates` can indicate faiure.
   * If it returns `false`, then this is a mismatch that may indicate a replay
   * fault with could be reported to a replay fault handler.
   * Otherwise, a throw indicates that something else bad happened,
   * such that the flow should transition to the Failed state.
   *
   * @param {Guest} g
   * @param {Host} h
   * @param {string} [label]
   * @returns {boolean}
   */
  const equates = (g, h, label = undefined) =>
    confirmEquates(g, h, false, label);
  const mustEquate = (g, h, label = undefined) =>
    confirmEquates(g, h, Fail, label);
  return harden({ equates, mustEquate });
};
harden(makeEquatesKit);

const makeConfirmEquates = bijection => {
  /**
   * The `reject` should only be used for failure that might indicate a
   * replay fault, such that `equates` should return `false`. For all other
   * failures to equates, this just uses `Fail` directly.
   *
   * @param {Guest} g
   * @param {Host} h
   * @param {Rejector} reject
   * @param {string} [label]
   * @returns {boolean}
   */
  const confirmEquates = (g, h, reject, label = undefined) => {
    // Open code the synchronous part of applyLabelingError, because
    // we need to preserve returned promise identity.
    // TODO switch to Richard Gibson's suggestion for a better way
    // to keep track of the error labeling.
    if (label === undefined) {
      return innerConfirmEquates(g, h, reject);
    }
    try {
      return innerConfirmEquates(g, h, reject);
    } catch (err) {
      throwLabeled(err, label);
    }
  };

  /**
   * @param {any} g
   * @param {any} h
   * @param {Rejector} reject
   * @returns {boolean}
   */
  const innerConfirmEquates = (g, h, reject) => {
    if (isPrimitive(g)) {
      return is(g, h) || (reject && reject`unequal ${g} vs ${h}`);
    }
    if (bijection.hasGuest(g) && bijection.guestToHost(g) === h) {
      // Note that this can be true even when
      // `bijection.hostToGuest(h) !== g`
      // but only when the two guests represent the same host, as
      // happens with unwrapping. That is why we do this one-way test
      // rather than the two way `bijection.has` test.
      // Even in this one-way case, we have still satisfied
      // the equates, so return true.
      return true;
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
      // return true;
    }
    const hPassStyle = passStyleOf(h);
    if (gPassStyle !== hPassStyle) {
      return (
        reject &&
        reject`unequal passStyles ${q(gPassStyle)} vs ${q(hPassStyle)}`
      );
    }
    switch (gPassStyle) {
      case 'copyArray': {
        return (
          confirmEquates(g.length, h.length, reject, 'length') &&
          g.every((gEl, i) => confirmEquates(gEl, h[i], reject, i))
        );
      }
      case 'copyRecord': {
        const gNames = recordNames(g);
        const hNames = recordNames(h);
        return (
          confirmEquates(gNames, hNames, reject, 'propertyNames') &&
          gNames.every(name => confirmEquates(g[name], h[name], reject, name))
        );
      }
      case 'tagged': {
        return (
          confirmEquates(getTag(g), getTag(h), reject, 'tag') &&
          confirmEquates(g.payload, h.payload, reject, 'payload')
        );
      }
      case 'error': {
        // Error annotations are not observable outside the console output,
        // so this does not breach membrane isolation.
        annotateError(g, X`replay of error ${h}`);
        annotateError(h, X`replayed as error ${g}`);
        // For errors, all that needs to agree on replay is the `name`
        // property. All others can differ. That's because everything else
        // is assumed to be diagnostic info useful to programmers, which
        // we'd like to improve over time. No programmatic use of additional
        // error diagnostic info other than to better inform developers.
        // A program should not take a semantically significant branch
        // based on any of this diagnostic info, aside from `name`.
        return confirmEquates(g.name, h.name, reject, 'error name');
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
  return harden(confirmEquates);
};
harden(makeConfirmEquates);
