/* global harden */
export const makeMembrane = (
  rootBlue,
  resultBlue = x => x,
  resultYellow = x => x,
) => {
  const blueToYellow = new WeakMap();
  const yellowToBlue = new WeakMap();

  const makePass = (
    nearToFar,
    farToNear,
    inverseName,
    result = (_xNear, _xFar) => {},
  ) => {
    return function passNearToFar(xNear) {
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

      // Object.setPrototypeOf(xFar, null);
      nearToFar.set(xNear, xFar);
      farToNear.set(xFar, xNear);

      const xDescs = Object.getOwnPropertyDescriptors(xNear);
      const xProto = Object.getPrototypeOf(xNear);
      const xFarProto = passNearToFar(xProto);
      // Object.setPrototypeOf(xFar, xFarProto);

      const nearToFarMapper = ([name, vNearDesc]) => {
        if ('value' in vNearDesc) {
          const vFarDesc = {
            ...vNearDesc,
            value: passNearToFar(vNearDesc.value),
          };
          return [name, vFarDesc];
        }
        const vFarDesc = {
          ...vNearDesc,
          get: passNearToFar(vNearDesc.get),
          set: passNearToFar(vNearDesc.set),
        };
        return [name, vFarDesc];
      };

      Object.entries(xDescs)
        .map(nearToFarMapper)
        .forEach(([name, descFar]) => {
          try {
            Object.defineProperty(xFar, name, descFar);
          } catch (e) {
            /* console.log(xNear, xDescs);
            throw e; */
          }
        });

      result(xNear, xFar);
      return harden(xFar);
    };
  };

  const passFunctions = {
    passYellowToBlue: makePass(
      yellowToBlue,
      blueToYellow,
      'passBlueToYellow',
      resultYellow,
    ),
    passBlueToYellow: makePass(
      blueToYellow,
      yellowToBlue,
      'passYellowToBlue',
      resultBlue,
    ),
  };

  return passFunctions.passBlueToYellow(rootBlue);
};
