import { makeMeteringTransformer } from './transform.js';

export function makeMeteredEvaluator({
  replaceGlobalMeter,
  refillMeterInNewTurn,
  makeEvaluator,
  babelCore,
  quiesceCallback = cb => cb(),
}) {
  const meteringTransform = makeMeteringTransformer(babelCore);
  const transforms = [meteringTransform];

  const ev = makeEvaluator({ transforms });
  const metersSeenThisTurn = new Set();

  const syncEval = (
    meter,
    srcOrThunk,
    endowments = {},
    whenQuiesced = undefined,
  ) => {
    let returned;
    let exceptionBox = false;

    // Enable the specific meter.
    const savedMeter = replaceGlobalMeter(null);
    try {
      if (whenQuiesced) {
        // Install the quiescence callback.
        quiesceCallback(() => {
          // console.log('quiescer exited');
          replaceGlobalMeter(savedMeter);
          // Declare that we're done the meter
          const seenMeters = [...metersSeenThisTurn.keys()];
          metersSeenThisTurn.clear();
          if (exceptionBox) {
            whenQuiesced([false, exceptionBox[0], seenMeters]);
          } else {
            whenQuiesced([true, returned, seenMeters]);
          }
        });
      }

      if (typeof srcOrThunk === 'string') {
        // Transform the source on our own budget, then evaluate against the meter.
        endowments.getMeter = m => {
          if (refillMeterInNewTurn && !metersSeenThisTurn.has(meter)) {
            metersSeenThisTurn.add(meter);
            refillMeterInNewTurn(meter);
          }
          if (m !== true) {
            replaceGlobalMeter(meter);
          }
          return meter;
        };
        returned = ev.evaluate(srcOrThunk, endowments);
      } else {
        // Evaluate the thunk with the specified meter.
        if (refillMeterInNewTurn && !metersSeenThisTurn.has(meter)) {
          metersSeenThisTurn.add(meter);
          refillMeterInNewTurn(meter);
        }
        replaceGlobalMeter(meter);
        returned = srcOrThunk();
      }
    } catch (e) {
      exceptionBox = [e];
    }
    try {
      replaceGlobalMeter(savedMeter);
      const seenMeters = [...metersSeenThisTurn.keys()];
      if (exceptionBox) {
        return [false, exceptionBox, seenMeters];
      }
      return [true, returned, seenMeters];
    } finally {
      if (whenQuiesced) {
        // Keep going with the specified meter while we're quiescing.
        replaceGlobalMeter(meter);
      }
    }
  };

  if (quiesceCallback) {
    const quiescingEval = (meter, srcOrThunk, endowments = {}) => {
      let whenQuiesced;
      const whenQuiescedP = new Promise(res => (whenQuiesced = res));

      // Defer the evaluation for another turn.
      Promise.resolve().then(_ =>
        syncEval(meter, srcOrThunk, endowments, whenQuiesced),
      );
      return whenQuiescedP;
    };
    return quiescingEval;
  }

  return syncEval;
}
