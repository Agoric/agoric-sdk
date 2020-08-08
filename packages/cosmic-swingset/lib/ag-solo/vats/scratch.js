/* global harden */

export default function makeScratchPad() {
  const map = new Map();
  async function get(idE) {
    const id = await idE;
    return map.get(id);
  }
  async function set(idE, objE) {
    const [id, obj] = await Promise.all([idE, objE]);
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
