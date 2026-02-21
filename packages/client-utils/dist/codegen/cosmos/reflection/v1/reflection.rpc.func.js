//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { FileDescriptorsRequest, FileDescriptorsResponse, } from '@agoric/cosmic-proto/codegen/cosmos/reflection/v1/reflection.js';
/**
 * FileDescriptors queries all the file descriptors in the app in order
 * to enable easier generation of dynamic clients.
 * @name getFileDescriptors
 * @package cosmos.reflection.v1
 * @see proto service: cosmos.reflection.v1.FileDescriptors
 */
export const getFileDescriptors = buildQuery({
    encode: FileDescriptorsRequest.encode,
    decode: FileDescriptorsResponse.decode,
    service: 'cosmos.reflection.v1.ReflectionService',
    method: 'FileDescriptors',
    deps: [FileDescriptorsRequest, FileDescriptorsResponse],
});
//# sourceMappingURL=reflection.rpc.func.js.map