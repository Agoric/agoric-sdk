import { Far } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  const o1 = Far('obj', {});
  const o2 = Far('obj', {});
  let hookdev;
  let devnode;

  const root = Far('root', {
    async bootstrap(_vats, devices) {
      hookdev = devices.hookdev;
    },

    async doCapdata(hookinput) {
      return D(hookdev).returnCapdata(hookinput);
    },
    async doActual(hookinput) {
      return D(hookdev).returnActual(hookinput);
    },

    async returnObjects() {
      return [root, o1, o2];
    },

    async doObjects() {
      return D(hookdev).returnCapdata(root, o1, o2);
    },
    async actualObjects() {
      return D(hookdev).returnActual(root, o1, o2);
    },
    async checkObjects1(data) {
      const rroot = D(hookdev).returnActual(data);
      return { match: rroot === root, rroot };
    },
    async checkObjects2(data) {
      const r2 = D(hookdev).returnActual(data);
      return { match: r2 === o2, r2 };
    },
    async checkObjects3(data) {
      const rextra2 = D(hookdev).returnActual(data);
      return { rextra2 };
    },
    async checkDevNodeIn(data) {
      devnode = D(hookdev).returnDevnode(data);
      D(hookdev).returnActual(devnode);
      return devnode;
    },
    async checkDevNodeOut(data) {
      const d2 = D(hookdev).returnActual(data);
      return { match: d2 === devnode, d2 };
    },
    async throwError(data) {
      try {
        const ret = D(hookdev).throwError(data); // will throw
        return { worked: true, ret };
      } catch (err) {
        return { worked: false, err };
      }
    },
    async missingHook(data) {
      try {
        const ret = D(hookdev).missingHook(data); // will throw
        return { worked: true, ret };
      } catch (err) {
        return { worked: false, err };
      }
    },
  });
  return root;
}
