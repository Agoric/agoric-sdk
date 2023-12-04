/** A unique object identity just for internal use. */
const PUMPKIN = harden({});

export const getFirstWhenable = (specimen, cb) =>
  Promise.resolve().then(async () => {
    let whenable0 = specimen && specimen.whenable0;

    // Take exactly 1 turn to find the first whenable, if any.
    const awaited = await (whenable0 ? PUMPKIN : specimen);
    if (awaited !== PUMPKIN) {
      specimen = awaited;
      whenable0 = specimen && specimen.whenable0;
    }

    return cb(specimen, whenable0);
  });
