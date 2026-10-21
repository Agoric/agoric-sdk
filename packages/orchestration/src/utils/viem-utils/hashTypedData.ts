/**
 * @file viem internal typedData utils exported for direct usage
 *
 * @license MIT
 * Copyright (c) 2023-present weth, LLC
 * Copied from https://github.com/wevm/viem/blob/ea0b9d4c391567dd811acbfd889121bb9cb1c26c/src/utils/signature/hashTypedData.ts
 */

type MessageTypeProperty = {
  name: string;
  type: string;
};

/**
 * Serialize an EIP-712 struct definition to a string per
 * https://eips.ethereum.org/EIPS/eip-712#definition-of-encodetype
 */
export function encodeType({
  primaryType,
  types,
}: {
  primaryType: string;
  types: Record<string, readonly MessageTypeProperty[]>;
}) {
  let result = '';
  const unsortedDeps = findTypeDependencies({ primaryType, types });
  unsortedDeps.delete(primaryType);

  const deps = [primaryType, ...Array.from(unsortedDeps).sort()];
  for (const type of deps) {
    result += `${type}(${types[type]
      .map(({ name, type: t }) => `${t} ${name}`)
      .join(',')})`;
  }

  return result;
}

function findTypeDependencies(
  {
    primaryType: primaryType_,
    types,
  }: {
    primaryType: string;
    types: Record<string, readonly MessageTypeProperty[]>;
  },
  results: Set<string> = new Set(),
): Set<string> {
  const match = primaryType_.match(/^\w*/u);
  const primaryType = match?.[0] as string;
  if (results.has(primaryType) || types[primaryType] === undefined) {
    return results;
  }

  results.add(primaryType);

  for (const field of types[primaryType]) {
    findTypeDependencies({ primaryType: field.type, types }, results);
  }
  return results;
}
