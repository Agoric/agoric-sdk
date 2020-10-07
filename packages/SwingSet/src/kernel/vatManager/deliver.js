// @ts-check
import { asMessage } from '../../message';

/**
 * @param {{
 *   vatID: string;
 *   stopGlobalMeter: () => void;
 *   meterRecord: TODO;
 *   refillAllMeters: () => void;
 *   transcriptManager: TODO;
 *   vatKeeper: TODO;
 *   waitUntilQuiescent: () => Promise<undefined>;
 * }} tools
 * @param {Record<string, (...args: unknown[]) => unknown>} dispatch
 * @typedef { any } TODO
 */
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
   * @param {() => unknown} f  The function to run
   * @param {string | null} errmsg  Tag string to be associated with the error message that gets
   *     logged if `f` rejects.
   * @returns { Promise<undefined> }
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

  /**
   *
   * @param {[string, ...unknown[]]} dispatchRecord
   * @param {string|null} errmsg
   * @returns { Promise<['ok'] | ['error', string ]> }
   */
  async function doProcess(dispatchRecord, errmsg) {
    const [dispatchOp, ...dispatchArgs] = dispatchRecord;
    transcriptManager.startDispatch(dispatchRecord);
    await runAndWait(() => dispatch[dispatchOp](...dispatchArgs), errmsg);
    stopGlobalMeter();

    /** @type {['ok'] | ['error', string ]} */
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

  /**
   * @param {Reference} targetSlot
   * @param {Message} msg_ Q: is there any rhyme or reason to when args
   *                       are assumed to be type-correct and when
   *                       they are checked? The checking seems incomplete.
   */
  async function deliverOneMessage(targetSlot, msg_) {
    const msg = asMessage(msg_);
    const errmsg = `vat[${vatID}][${targetSlot}].${msg.method} dispatch failed`;
    return doProcess(
      ['deliver', targetSlot, msg.method, msg.args, msg.result],
      errmsg,
    );
  }

  /**
   * @param {PromiseReference} vpid
   * @param {Resolution} vp
   */
  async function deliverOneNotification(vpid, vp) {
    const errmsg = `vat[${vatID}].promise[${vpid}] ${vp.state} failed`;
    switch (vp.state) {
      case 'fulfilledToPresence':
        return doProcess(['notifyFulfillToPresence', vpid, vp.slot], errmsg);
      // @ts-ignore
      case 'redirected':
        // TODO unimplemented
        throw new Error('not implemented yet');
      case 'fulfilledToData':
        return doProcess(['notifyFulfillToData', vpid, vp.data], errmsg);
      case 'rejected':
        return doProcess(['notifyReject', vpid, vp.data], errmsg);
      default:
        // @ts-ignore
        throw Error(`unknown promise state '${vp.state}'`);
    }
  }

  /**
   * @param {Delivery} vatDeliverObject
   */
  async function deliver(vatDeliverObject) {
    switch (vatDeliverObject[0]) {
      case 'message': {
        // Q: was the former use of ...args here defensive
        // in case vatDeliverObject was the wrong length?
        // If so, why assume vatDeliverObject is an Array at all?
        // Or is the fact that the destructuring assignment
        // will throw if it is not supposed to suffice?
        const [_ty, ref, msg] = vatDeliverObject;
        return deliverOneMessage(ref, msg);
      }
      case 'notify': {
        const [_ty, ref, res] = vatDeliverObject;
        return deliverOneNotification(ref, res);
      }
      default:
        throw Error(`unknown delivery type ${vatDeliverObject[0]}`);
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
