//@ts-nocheck
import { buildQuery } from '../../../helper-func-types.js';
import {
  FileDescriptorsRequest,
  FileDescriptorsResponse,
} from './reflection.js';
/**
 * FileDescriptors queries all the file descriptors in the app in order
 * to enable easier generation of dynamic clients.
 * @name getFileDescriptors
 * @package cosmos.reflection.v1
 * @see proto service: cosmos.reflection.v1.FileDescriptors
 */
export const getFileDescriptors = buildQuery<
  FileDescriptorsRequest,
  FileDescriptorsResponse
>({
  encode: FileDescriptorsRequest.encode,
  decode: FileDescriptorsResponse.decode,
  service: 'cosmos.reflection.v1.ReflectionService',
  method: 'FileDescriptors',
});
