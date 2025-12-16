/**
 * @file bundling these functions results in something that
 * depends on node APIs such as stream and crypto (viem/utils
 * includes an http client etc.)
 *
 * So we use tsup to do dead code elimination, aka tree-shaking,
 * while preserving type info.
 */
export { encodeFunctionData } from 'viem/utils';
export { decodeAbiParameters } from 'viem/utils';
export { encodeAbiParameters } from 'viem/utils';
export { hashStruct, hashTypedData, recoverTypedDataAddress, verifyTypedData, serializeTypedData, validateTypedData } from 'viem/utils';
export { secp256k1 } from '@noble/curves/secp256k1';