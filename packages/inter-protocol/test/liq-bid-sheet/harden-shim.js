"use strict";

globalThis.harden = Object.freeze; // IOU

const assert = (cond, msg) => {
  if (!cond) throw Error(msg)
}