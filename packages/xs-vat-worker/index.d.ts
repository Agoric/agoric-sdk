/**
 * Synchronous syscall
 *
 * ref vat-worker protocol
 * ../SwingSet/docs/vat-worker.md
 *
 * @param request JSON, UTF-8 serialized Syscall
 * @returns JSON, UTF-8 serialized SyscallResult
 */
declare function sysCall(request: ArrayBuffer): ArrayBuffer;
