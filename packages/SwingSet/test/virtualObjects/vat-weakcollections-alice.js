/* global makeKind */
import { Far } from '@endo/marshal';

function makeHolderInstance(state) {
  function init(value) {
    state.value = value;
  }
  const self = Far('holder-vo', {
    getValue() {
      return state.value;
    },
    setValue(newValue) {
      state.value = newValue;
    },
  });
  return { init, self };
}

const holderMaker = makeKind(makeHolderInstance);

export function buildRootObject() {
  const testWeakMap = new WeakMap();
  let memorableExportRemotable;
  let memorableExportVirtualObject;
  let memorableExportPromise;
  let forgetableExportRemotable;
  let forgetableExportVirtualObject;
  let forgetableExportPromise;

  return Far('root', {
    prepareWeakMap(theirStuff) {
      memorableExportRemotable = Far('remember-exp', {});
      memorableExportVirtualObject = holderMaker('remember-exp-vo');
      memorableExportPromise = new Promise((_res, _rej) => {});
      forgetableExportRemotable = Far('forget-exp', {});
      forgetableExportVirtualObject = holderMaker('forget-exp-vo');
      forgetableExportPromise = new Promise((_res, _rej) => {});

      const result = [
        memorableExportRemotable,
        memorableExportVirtualObject,
        memorableExportPromise,
        forgetableExportRemotable,
        forgetableExportVirtualObject,
        forgetableExportPromise,
      ];

      let i = 0;
      for (const item of theirStuff) {
        testWeakMap.set(item, `imported item #${i}`);
        i += 1;
      }
      testWeakMap.set(memorableExportRemotable, 'mer');
      testWeakMap.set(memorableExportVirtualObject, 'mevo');
      testWeakMap.set(memorableExportPromise, 'mep');
      testWeakMap.set(forgetableExportRemotable, 'fer');
      testWeakMap.set(forgetableExportVirtualObject, 'fevo');
      testWeakMap.set(forgetableExportPromise, 'fep');
      forgetableExportRemotable = null;
      forgetableExportVirtualObject = null;
      forgetableExportPromise = null;

      return result;
    },
    probeWeakMap(probe) {
      return testWeakMap.get(probe);
    },
  });
}
