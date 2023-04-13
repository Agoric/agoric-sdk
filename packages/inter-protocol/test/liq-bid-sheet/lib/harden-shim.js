globalThis.harden = Object.freeze; // IOU

export const assert = (cond, msg) => {
  if (!cond) throw Error(msg);
};
