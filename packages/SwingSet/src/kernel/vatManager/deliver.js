import { insistMessage } from '../../message';

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

  async function doProcess(dispatchRecord, errmsg) {
    const dispatchOp = dispatchRecord[0];
    const dispatchArgs = dispatchRecord.slice(1);
    transcriptManager.startDispatch(dispatchRecord);
    await runAndWait(() => dispatch[dispatchOp](...dispatchArgs), errmsg);
    stopGlobalMeter();

    let status = ['ok'];
    // refill this vat's meter, if any, accumulating its usage for stats
    if (meterRecord) {
      // note that refill() won't actually refill an exhausted meter
      const used = meterRecord.refill();
      const exhaustionError = meterRecord.isExhausted();
      if (exhaustionError) {
        status = ['error', exhaustionError.message];
      } else {
        updateStats(used);
      }
    }

    // refill all within-vat -created meters
    refillAllMeters();

    // TODO: if the dispatch failed, and we choose to destroy the vat, change
    // what we do with the transcript here.
    transcriptManager.finishDispatch();
    return status;
  }

  async function deliverOneMessage(targetSlot, msg) {
    insistMessage(msg);
    const errmsg = `vat[${vatID}][${targetSlot}].${msg.method} dispatch failed`;
    return doProcess(
      ['deliver', targetSlot, msg.method, msg.args, msg.result],
      errmsg,
    );
  }

  async function deliverOneNotification(vpid, vp) {
    const errmsg = `vat[${vatID}].promise[${vpid}] ${vp.state} failed`;
    switch (vp.state) {
      case 'fulfilledToPresence':
        return doProcess(['notifyFulfillToPresence', vpid, vp.slot], errmsg);
      case 'redirected':
        // TODO unimplemented
        throw new Error('not implemented yet');
      case 'fulfilledToData':
        return doProcess(['notifyFulfillToData', vpid, vp.data], errmsg);
      case 'rejected':
        return doProcess(['notifyReject', vpid, vp.data], errmsg);
      default:
        throw Error(`unknown promise state '${vp.state}'`);
    }
  }

  // vatDeliverObject is:
  //  ['message', target, msg]
  //   target is vid
  //   msg is: { method, args (capdata), result }
  //  ['notify', vpid, vp]
  //   vp is the current (final) promise data, rendered in vat form
  async function deliver(vatDeliverObject) {
    const [type, ...args] = vatDeliverObject;
    switch (type) {
      case 'message':
        return deliverOneMessage(...args);
      case 'notify':
        return deliverOneNotification(...args);
      default:
        throw Error(`unknown delivery type ${type}`);
    }
  }

  async function replayTranscript() {
    transcriptManager.startReplay();
    for (const t of vatKeeper.getTranscript()) {
      transcriptManager.checkReplayError();
      transcriptManager.startReplayDelivery(t.syscalls);
      // eslint-disable-next-line no-await-in-loop
      await doProcess(t.d, null);
    }
    transcriptManager.checkReplayError();
    transcriptManager.finishReplay();
  }

  return harden({ deliver, replayTranscript });
}
