/**
 * @file bundling these functions results in something that
 * depends on node APIs such as stream and crypto (viem/utils
 * includes an http client etc.)
 *
 * So we use tsup to do dead code elimination, aka tree-shaking,
 * while preserving type info.
 */
export {
  hashStruct,
  hashTypedData,
  recoverTypedDataAddress,
  verifyTypedData,
  serializeTypedData,
  validateTypedData,
} from 'viem/utils';
export { encodeType } from '../utils/viem-utils/hashTypedData.ts';
