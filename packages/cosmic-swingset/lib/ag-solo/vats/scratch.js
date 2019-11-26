import harden from '@agoric/harden';

export default function makeScratchPad() {
  const map = new Map();
  async function get(idP) {
    const id = await idP;
    return map.get(id);
  }
  async function set(idP, objP) {
    const [id, obj] = await Promise.all([idP, objP]);
    map.set(id, obj);
    return id;
  }
  function list() {
    const ids = [];
    for (const id of map.keys()) {
      ids.push(id);
    }
    return harden(ids.sort());
  }
  return {
    get,
    set,
    list,
  };
}
