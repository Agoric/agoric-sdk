import { getTag } from '@endo/pass-style';

export const getWhenable0 = specimen =>
  typeof specimen === 'object' &&
  getTag(specimen) === 'Whenable' &&
  specimen.payload &&
  specimen.payload.whenable0;

/** A unique object identity just for internal use. */
const PUMPKIN = harden({});

export const getFirstWhenable = (specimen, cb) =>
  Promise.resolve().then(async () => {
    let whenable0 = getWhenable0(specimen);

    // Take exactly 1 turn to find the first whenable, if any.
    const awaited = await (whenable0 ? PUMPKIN : specimen);
    if (awaited !== PUMPKIN) {
      specimen = awaited;
      whenable0 = getWhenable0(specimen);
    }

    return cb(specimen, whenable0);
  });
