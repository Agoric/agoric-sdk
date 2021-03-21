/** @type { (delivery: VatDeliveryObject, prefix: string) => string } */
function summarizeDelivery(vatDeliveryObject, prefix = 'vat') {
  const [type, ...args] = vatDeliveryObject;
  if (type === 'message') {
    const [targetSlot, msg] = args[0];
    return `${prefix}[${targetSlot}].${msg.method} dispatch failed`;
  }
  return `${prefix}.${type} failed`;
}
harden(summarizeDelivery);
export { summarizeDelivery };

export function makeDeliver(tools, dispatch) {
  const {
    meterRecord,
    refillAllMeters,
    stopGlobalMeter,
    transcriptManager,
    vatID,
    vatKeeper,
    waitUntilQuiescent,
  } = tools;

  /**
   * Run a function, returning a promise that waits for the promise queue to be
   * empty before resolving.
   *
   * @param {*} f  The function to run
   * @param {string} errmsg  Tag string to be associated with the error message that gets
   *     logged if `f` rejects.
   *
   * The kernel uses `runAndWait` to wait for the vat to become quiescent (that
   * is, with nothing remaining on the promise queue) after a dispatch call.
   * Since the vat is never given direct access to the timer or IO queues (i.e.,
   * it can't call setImmediate, setInterval, or setTimeout), once the promise
   * queue is empty, the vat has lost "agency" (the ability to initiate further
   * execution).  The kernel *does not* wait for the dispatch handler's return
   * promise to resolve, since a malicious or erroneous vat might fail to do
   * so, and the kernel must be defensive against this.
   */
  function runAndWait(f, errmsg) {
    // prettier-ignore
    Promise.resolve()
      .then(f)
      .then(
        undefined,
        err => console.log(`doProcess: ${errmsg}: ${err.message}`),
      );
    return waitUntilQuiescent();
  }

  function updateStats(_used) {
    // TODO: accumulate used.allocate and used.compute into vatStats
  }

  // vatDeliveryObject is one of:
  //  ['message', target, msg]
  //   target is vref
  //   msg is: { method, args (capdata), result }
  //  ['notify', resolutions]
  //   resolutions is an array of triplets: [vpid, rejected, value]
  //    vpid is the id of the primary promise being resolved
  //    rejected is a boolean flag indicating if vpid is being fulfilled or rejected
  //    value is capdata describing the value the promise is being resolved to
  //   The first entry in the resolutions array is the primary promise being
  //     resolved, while the remainder (if any) are collateral promises it
  //     references whose resolution was newly discovered at the time the
  //     notification delivery was being generated
  //   ['dropExports', vrefs]

  async function deliver(vatDeliveryObject) {
    const errmsg = summarizeDelivery(vatDeliveryObject, `vat[${vatID}]`);
    transcriptManager.startDispatch(vatDeliveryObject);
    await runAndWait(() => dispatch(vatDeliveryObject), errmsg);
    stopGlobalMeter();

    let status = ['ok', null, null];
    // refill this vat's meter, if any, accumulating its usage for stats
    if (meterRecord) {
      // note that refill() won't actually refill an exhausted meter
      const meterUsage = meterRecord.refill();
      const exhaustionError = meterRecord.isExhausted();
      if (exhaustionError) {
        status = ['error', exhaustionError.message, meterUsage];
      } else {
        // We will have ['ok', null, meterUsage]
        status[2] = meterUsage;
        updateStats(status[2]);
      }
    }

    // refill all within-vat -created meters
    refillAllMeters();

    // TODO: if the dispatch failed, and we choose to destroy the vat, change
    // what we do with the transcript here.
    transcriptManager.finishDispatch();
    return status;
  }

  async function replayTranscript() {
    transcriptManager.startReplay();
    for (const t of vatKeeper.getTranscript()) {
      transcriptManager.checkReplayError();
      transcriptManager.startReplayDelivery(t.syscalls);
      // eslint-disable-next-line no-await-in-loop
      await deliver(t.d);
    }
    transcriptManager.checkReplayError();
    transcriptManager.finishReplay();
  }

  return harden({ deliver, replayTranscript });
}
