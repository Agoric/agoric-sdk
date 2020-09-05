/* global harden */
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
   *
   * @param {WeakMap<any,any>} nearToFar
   * @param {WeakMap<any,any>} farToNear
   * @param {(xNear: any) => any} distort
   * @param {(xFar: any, xNear: any) => any} finish
   * @param {'blueToYellow' | 'yellowToBlue'} inverseName
   */
  const makePass = (nearToFar, farToNear, distort, finish, inverseName) => {
    return function passNearToFar(xNear) {
      xNear = distort(xNear);
      if (Object(xNear) !== xNear) {
        return xNear;
      }
      if (nearToFar.has(xNear)) {
        return nearToFar.get(xNear);
      }
      // We have an object or function.
      let xFar;
      if (typeof xNear === 'function') {
        // eslint-disable-next-line no-use-before-define
        const passFarToNear = passFunctions[inverseName];
        xFar = function farFunction(...argsFar) {
          try {
            const argsNear = argsFar.map(passFarToNear);
            if (new.target) {
              const newTargetNear = passFarToNear(new.target);
              return passNearToFar(
                Reflect.construct(xNear, argsNear, newTargetNear),
              );
            }
            const thisNear = passFarToNear(this);
            return passNearToFar(Reflect.apply(xNear, thisNear, argsNear));
          } catch (eNear) {
            throw passNearToFar(eNear);
          }
        };
      } else {
        xFar = {};
      }

      nearToFar.set(xNear, xFar);
      farToNear.set(xFar, xNear);

      const xDescsNear = Object.getOwnPropertyDescriptors(xNear);
      const xProtoNear = Object.getPrototypeOf(xNear);
      const xProtoFar = passNearToFar(xProtoNear);

      xProtoFar; // Silence unused warning.
      /* Object.setPrototypeOf(xFar, xProtoFar); */
      // FIXME: If above is uncommented, fails with:
      // TypeError {
      //   message: 'a prototype of something is not already in the fringeset (and .toString failed)',
      // }

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

      const xFinished = finish(xFar, xNear);
      return harden(xFinished);
    };
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
