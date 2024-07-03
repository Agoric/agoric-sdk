import { Fail, X, annotateError, makeError, q } from '@endo/errors';
import { throwLabeled } from '@endo/common/throw-labeled.js';
import { objectMap } from '@endo/common/object-map.js';
import {
  getErrorConstructor,
  getTag,
  isObject,
  makeTagged,
  passStyleOf,
} from '@endo/pass-style';
import { isVow } from '@agoric/vow/src/vow-utils.js';

/**
 * @import {Passable} from '@endo/pass-style'
 */

const makeConvert = (convertRemotable, convertPromiseOrVow, convertError) => {
  const convertRecur = (specimen, label) => {
    // Open code the synchronous part of applyLabelingError, because
    // we need to preserve returned promise identity.
    // TODO switch to Richard Gibson's suggestion for a better way
    // to keep track of the error labeling.
    // See https://github.com/endojs/endo/pull/1795#issuecomment-1756093032
    if (label === undefined) {
      // eslint-disable-next-line no-use-before-define
      return innerConvert(specimen);
    }
    try {
      // eslint-disable-next-line no-use-before-define
      return innerConvert(specimen);
    } catch (err) {
      throwLabeled(err, label);
    }
  };

  const innerConvert = specimen => {
    if (!isObject(specimen)) {
      return specimen;
    }
    const passStyle = passStyleOf(specimen);
    switch (passStyle) {
      case 'copyArray': {
        return specimen.map((element, i) => convertRecur(element, i));
      }
      case 'copyRecord': {
        return objectMap(specimen, (value, name) => convertRecur(value, name));
      }
      case 'tagged': {
        if (isVow(specimen)) {
          return convertPromiseOrVow(specimen);
        }
        const tag = getTag(specimen);
        const { payload } = specimen;
        return makeTagged(tag, convertRecur(payload, `${tag} payload`));
      }
      case 'error': {
        return convertError(specimen);
      }
      case 'remotable': {
        return convertRemotable(specimen);
      }
      case 'promise': {
        return convertPromiseOrVow(specimen);
      }
      default: {
        throw Fail`unexpected passStyle ${q(passStyle)}`;
      }
    }
  };

  /**
   * @param {Passable} specimen
   * @param {string} [label]
   */
  const convert = (specimen, label = undefined) =>
    convertRecur(harden(specimen), label);
  return harden(convert);
};

export const makeConvertKit = (
  bijection,
  makeGuestForHostRemotable,
  makeGuestForHostVow,
) => {
  const guestToHost = makeConvert(
    gRem => {
      if (bijection.hasGuest(gRem)) {
        return bijection.guestToHost(gRem);
      }
      throw Fail`cannot yet send guest remotables ${gRem}`;
    },
    gProm => {
      if (bijection.hasGuest(gProm)) {
        return bijection.guestToHost(gProm);
      }
      throw Fail`cannot yet send guest promises ${gProm}`;
    },
    gErr => {
      const hErr = harden(
        makeError(gErr.message, getErrorConstructor(gErr.name)),
      );
      annotateError(hErr, X`from guest error ${gErr}`);
      return hErr;
    },
  );

  const hostToGuest = makeConvert(
    hRem => {
      if (bijection.hasHost(hRem)) {
        return bijection.hostToGuest(hRem);
      }
      const gRem = makeGuestForHostRemotable(hRem);
      return bijection.unwrapInit(gRem, hRem);
    },
    hVow => {
      if (bijection.hasHost(hVow)) {
        return bijection.hostToGuest(hVow);
      }
      const gP = makeGuestForHostVow(hVow);
      return bijection.unwrapInit(gP, hVow);
    },
    hErr => {
      const gErr = harden(
        makeError(hErr.message, getErrorConstructor(hErr.name)),
      );
      annotateError(gErr, X`from host error ${hErr}`);
      return gErr;
    },
  );

  return harden({ guestToHost, hostToGuest });
};
harden(makeConvertKit);
