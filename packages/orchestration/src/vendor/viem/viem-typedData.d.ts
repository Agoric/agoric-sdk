export { hashStruct, hashTypedData, isHex, recoverTypedDataAddress, serializeTypedData, validateTypedData, verifyTypedData } from 'viem/utils';

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
declare function encodeType({ primaryType, types, }: {
    primaryType: string;
    types: Record<string, readonly MessageTypeProperty[]>;
}): string;

export { encodeType };
