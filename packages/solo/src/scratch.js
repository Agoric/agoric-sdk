import { Far } from '@agoric/marshal';

export default function makeScratchPad() {
  const map = new Map();
  return Far('scratchPad', {
    get: async idP => {
      const id = await idP;
      return map.get(id);
    },
    set: async (idP, objP) => {
      const [id, obj] = await Promise.all([idP, objP]);
      map.set(id, obj);
      return id;
    },
    init: async (idP, objP) => {
      const [id, obj] = await Promise.all([idP, objP]);
      if (map.has(id)) {
        throw Error(`Scratchpad already has id ${id}`);
      }
      map.set(id, obj);
      return id;
    },
    list: async () => {
      const ids = [...map.keys()];
      return harden(ids.sort());
    },
  });
}
