// We use vat-centric terminology here, so "inbound" means "into a vat",
// generally from the kernel. We also have "comms vats" which use special
// device access to interact with remote machines: messages from those
// remote machines are "inbound" into the comms vats. Conversely "outbound"
// means "out of a vat", usually into the local kernel, but we also use
// "outbound" to describe the messages a comms vat is sending over a socket
// or other communications channel.

// The mapVatSlotToKernelSlot() function is used to translate slot references
// on the vat->kernel pathway. mapKernelToVatSlot() is used for kernel->vat.

// The terms "import" and "export" are also vat-centric. "import" means
// something a Vat has imported (from the kernel). Imports are tracked in a
// kernel-side table for each Vat, which is populated by the kernel as a
// message is delivered. Each import is represented inside the Vat as a
// Presence (at least when using liveSlots).

// "exports" are callable objects inside the Vat which it has made
// available to the kernel (so that other vats can invoke it). The exports
// table is managed by userspace code inside the vat. The kernel tables map
// one vat's import IDs (o-NN) to a kernel object ID (koNN) in the
// vatKeeper's state.vatSlotToKernelSlot table. To make sure we use the
// same importID each time, we also need to keep a reverse table:
// kernelSlotToVatSlot maps them back.

// Comms vats will have their own internal tables to track references
// shared with other machines. These will have mapInbound/mapOutbound too.
// A message arriving on a communication channel will pass through the
// comms vat's mapInbound to figure out which "machine export" is the
// target, which maps to a "vat import" (coming from the kernel). The
// arguments might also be machine exports (for arguments that are "coming
// home"), or more commonly will be new machine imports (for arguments that
// point to other machines, usually the sending machine). The machine
// imports will be presented to the kernel as exports of the comms vat.

// The vat sees "vat slots" (object references) as the arguments of
// syscall/dispatch functions. These take on the following forms (where
// "NN" is an integer):

// o+NN : an object ref allocated by this Vat, hence an export
// o-NN : an object ref allocated by the kernel, an imported object
// p-NN : a promise ref allocated by the kernel
// p+NN : (todo) a promise ref allocated by this vat
// d-NN : a device ref allocated by the kernel, imported

// Within the kernel, we use "kernel slots", with the following forms:

// koNN : an object reference
// kpNN : a promise reference
// kdNN : a device reference

// The vatManager is responsible for translating vat slots into kernel
// slots on the outbound (syscall) path, and kernel slots back into vat
// slots on the inbound (dispatch) path.

export function createSyscall(transcriptManager) {
  let vatSyscallHandler;
  function setVatSyscallHandler(handler) {
    vatSyscallHandler = handler;
  }

  /* vatSyscallObject is an array that starts with the syscall name ('send',
   * 'subscribe', etc) followed by all the positional arguments of the
   * syscall, designed for transport across a manager-worker link (serialized
   * bytes over a socket or pipe, postMessage to an in-process Worker, or
   * just direct).
   */
  function doSyscall(vatSyscallObject) {
    if (transcriptManager.inReplay()) {
      // We're replaying old messages to bring the vat's internal state
      // up-to-date. It will make syscalls like a puppy chasing rabbits in
      // its sleep. Gently prevent their twitching paws from doing anything.

      // but if the puppy deviates one inch from previous twitches, explode
      return transcriptManager.simulateSyscall(vatSyscallObject);
    }

    const vres = vatSyscallHandler(vatSyscallObject);
    // vres is ['error', reason] or ['ok', null] or ['ok', capdata]
    const [successFlag, data] = vres;
    if (successFlag === 'error') {
      // Something went wrong, and we about to die. Either the kernel
      // suffered a fault (and we'll be shut down momentarily along with
      // everything else), or we reached for a clist entry that wasn't there
      // (and we'll be terminated, but the kernel and all other vats will
      // continue). Emit enough of an error message to explain the errors
      // that are about to ensue on our way down.
      throw Error(
        `syscall ${vatSyscallObject[0]} suffered error, shutdown commencing`,
      );
    }
    // otherwise vres is ['ok', null] or ['ok', capdata]
    transcriptManager.addSyscall(vatSyscallObject, data);
    return data;
  }

  const syscall = harden({
    send: (...args) => doSyscall(['send', ...args]),
    callNow: (...args) => doSyscall(['callNow', ...args]),
    subscribe: (...args) => doSyscall(['subscribe', ...args]),
    resolve: (...args) => doSyscall(['resolve', ...args]),
    exit: (...args) => doSyscall(['exit', ...args]),
    vatstoreGet: (...args) => doSyscall(['vatstoreGet', ...args]),
    vatstoreSet: (...args) => doSyscall(['vatstoreSet', ...args]),
    vatstoreDelete: (...args) => doSyscall(['vatstoreDelete', ...args]),
    dropImports: (...args) => doSyscall(['dropImports', ...args]),
  });

  return harden({ syscall, doSyscall, setVatSyscallHandler });
}
