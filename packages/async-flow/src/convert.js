import { Fail, X, annotateError, makeError, q } from '@endo/errors';
import { throwLabeled } from '@endo/common/throw-labeled.js';
import {
  getErrorConstructor,
  isObject,
  makeTagged,
  passStyleOf,
} from '@endo/pass-style';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { objectMap } from '@endo/common/object-map.js';

const makeConvert = (convertRemotable, convertPromiseOrVow, convertError) => {
  const convert = (specimen, label) => {
    // Open code the synchronous part of applyLabelingError, because
    // we need to preserve returned promise identity.
    // TODO switch to Richard Gibson's suggestion for a better way
    // to keep track of the error labeling.
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
        return specimen.map((element, i) => convert(element, i));
      }
      case 'copyRecord': {
        return objectMap(specimen, (value, name) => convert(value, name));
      }
      case 'tagged': {
        if (isVow(specimen)) {
          return convertPromiseOrVow(specimen);
        }
        return makeTagged(specimen.tag, specimen.payload);
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
      bijection.init(gRem, hRem);
      return gRem;
    },
    hVow => {
      if (bijection.hasHost(hVow)) {
        return bijection.hostToGuest(hVow);
      }
      const gP = makeGuestForHostVow(hVow);
      bijection.init(gP, hVow);
      return gP;
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
