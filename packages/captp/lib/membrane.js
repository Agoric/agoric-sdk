// @ts-check

/**
 * @typedef {({} | Function) & 'Near'} NearRef Intersection to make compatible only with itself.
 * @typedef {({} | Function) & 'Far'} FarRef Intersection to make compatible only with itself.
 */

/**
 * @param {*} x
 */
const IDENTITY = x => x;

export const makeMembrane = (rootBlue, opts = {}) => {
  const {
    distortBlue = IDENTITY,
    distortYellow = IDENTITY,
    finishBlue = IDENTITY,
    finishYellow = IDENTITY,
  } = opts;

  const blueToYellow = new WeakMap();
  const yellowToBlue = new WeakMap();

  /**
   * @param {WeakMap<NearRef, FarRef>} nearToFar
   * @param {WeakMap<FarRef, NearRef>} farToNear
   * @param {(xNear: any, makeNear: (xFar: FarRef) => NearRef) => any} distort
   * @param {(xFar: FarRef, xNear: NearRef) => any} finish
   * @param {'passBlueToYellow' | 'passYellowToBlue'} inverseName
   */
  const makePass = (nearToFar, farToNear, distort, finish, inverseName) => {
    /**
     * @param {any} xNear
     * @returns {any}
     */
    function passNearToFar(xNear) {
      // eslint-disable-next-line no-use-before-define
      const passFarToNear = passFunctions[inverseName];

      xNear = distort(xNear, passFarToNear);
      if (Object(xNear) !== xNear) {
        // Primitive value, no need to membranise.
        return xNear;
      }

      // We now know we're dealing with an near object or function.
      const xNearRef = /** @type {NearRef} */ (xNear);

      /**
       * @type {FarRef=}
       */
      let xFar = nearToFar.get(xNearRef);
      if (xFar) {
        // Cached.
        return xFar;
      }
      // We have an object or function.
      if (typeof xNearRef === 'function') {
        const fnNear = /** @type {Function} */ (xNearRef);
        function fnFar(...argsFar) {
          try {
            const argsNear = argsFar.map(passFarToNear);
            if (new.target) {
              const newTargetNear = passFarToNear(new.target);
              return passNearToFar(
                Reflect.construct(fnNear, argsNear, newTargetNear),
              );
            }
            const thisNear = passFarToNear(this);
            return passNearToFar(Reflect.apply(fnNear, thisNear, argsNear));
          } catch (eNear) {
            throw passNearToFar(eNear);
          }
        }
        /** Typecasts necessary */
        const fnUnknown = /** @type {unknown} */ (fnFar);
        xFar = /** @type {FarRef} */ (fnUnknown);
      } else {
        xFar = /** @type {FarRef} */ ({});
      }

      nearToFar.set(xNearRef, xFar);
      farToNear.set(xFar, xNearRef);

      const xDescsNear = Object.getOwnPropertyDescriptors(xNearRef);
      const xProtoNear = Object.getPrototypeOf(xNearRef);
      const xProtoFar = passNearToFar(xProtoNear);

      xProtoFar; // Silence unused warning.
      /* Object.setPrototypeOf(xFar, xProtoFar); */
      // FIXME: If above is uncommented, fails with:
      // TypeError {
      //   message: 'a prototype of something is not already in the fringeset (and .toString failed)',
      // }

      /**
       * @param {[string, PropertyDescriptor]} param0
       * @returns {[string, PropertyDescriptor]}
       */
      const nearToFarMapper = ([name, vDescNear]) => {
        if ('value' in vDescNear) {
          const vDescFar = {
            ...vDescNear,
            value: passNearToFar(vDescNear.value),
          };
          return [name, vDescFar];
        }
        const vFarDesc = {
          ...vDescNear,
          get: passNearToFar(vDescNear.get),
          set: passNearToFar(vDescNear.set),
        };
        return [name, vFarDesc];
      };

      Object.entries(xDescsNear)
        .map(nearToFarMapper)
        .forEach(([name, descFar]) => {
          try {
            Object.defineProperty(xFar, name, descFar);
          } catch (e) {
            /*
            console.log(xNear, xDescsNear);
            throw e;
            */
            // FIXME: If above is uncommented, fails with:
            // TypeError {
            //   message: 'Cannot redefine property: name',
            // }
          }
        });

      const xFinished = finish(xFar, xNearRef);
      return harden(xFinished);
    }
    return passNearToFar;
  };

  const passFunctions = {
    passYellowToBlue: makePass(
      yellowToBlue,
      blueToYellow,
      distortYellow,
      finishBlue,
      'passBlueToYellow',
    ),
    passBlueToYellow: makePass(
      blueToYellow,
      yellowToBlue,
      distortBlue,
      finishYellow,
      'passYellowToBlue',
    ),
  };

  return passFunctions.passBlueToYellow(rootBlue);
};
