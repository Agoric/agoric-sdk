import {
  hashStruct,
  hashTypedData,
  recoverTypedDataAddress,
  serializeTypedData,
  validateTypedData,
  verifyTypedData
} from "./chunk-ZKSIP2AM.js";
import {
  isHex
} from "./chunk-GCI53Z2G.js";
import "./chunk-4VNS5WPM.js";

// src/utils/viem-utils/hashTypedData.ts
function encodeType({
  primaryType,
  types
}) {
  let result = "";
  const unsortedDeps = findTypeDependencies({ primaryType, types });
  unsortedDeps.delete(primaryType);
  const deps = [primaryType, ...Array.from(unsortedDeps).sort()];
  for (const type of deps) {
    result += `${type}(${types[type].map(({ name, type: t }) => `${t} ${name}`).join(",")})`;
  }
  return result;
}
function findTypeDependencies({
  primaryType: primaryType_,
  types
}, results = /* @__PURE__ */ new Set()) {
  const match = primaryType_.match(/^\w*/u);
  const primaryType = match?.[0];
  if (results.has(primaryType) || types[primaryType] === void 0) {
    return results;
  }
  results.add(primaryType);
  for (const field of types[primaryType]) {
    findTypeDependencies({ primaryType: field.type, types }, results);
  }
  return results;
}
export {
  encodeType,
  hashStruct,
  hashTypedData,
  isHex,
  recoverTypedDataAddress,
  serializeTypedData,
  validateTypedData,
  verifyTypedData
};
/**
 * @file viem internal typedData utils exported for direct usage
 *
 * @license MIT
 * Copyright (c) 2023-present weth, LLC
 * Copied from https://github.com/wevm/viem/blob/ea0b9d4c391567dd811acbfd889121bb9cb1c26c/src/utils/signature/hashTypedData.ts
 */
