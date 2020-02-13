import { makeMeteringTransformer } from './transform';

export function makeMeteredEvaluator({
  replaceGlobalMeter,
  makeEvaluator,
  babelCore,
  quiesceCallback = cb => cb(),
}) {
  const meteringTransform = makeMeteringTransformer(babelCore);
  const transforms = [meteringTransform];

  const ev = makeEvaluator({ transforms });

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
          whenQuiesced({
            exhausted: meter.isExhausted(),
            returned,
            exceptionBox,
          });
        });
      }

      if (typeof srcOrThunk === 'string') {
        // Transform the source on our own budget, then evaluate against the meter.
        endowments.getGlobalMeter = m => {
          if (m !== true) {
            replaceGlobalMeter(meter);
          }
          return meter;
        };
        returned = ev.evaluate(srcOrThunk, endowments);
      } else {
        // Evaluate the thunk with the specified meter.
        replaceGlobalMeter(meter);
        returned = srcOrThunk();
      }
    } catch (e) {
      exceptionBox = [e];
    }
    try {
      replaceGlobalMeter(savedMeter);
      const exhausted = meter.isExhausted();
      return {
        exhausted,
        returned,
        exceptionBox,
      };
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
      const whenQuiescedP = new Promise(res => (whenQuiesced = res)).then(
        ({ exhausted, returned, exceptionBox }) => {
          if (exhausted) {
            // The meter was exhausted.
            throw exhausted;
          }
          if (exceptionBox) {
            // The source threw an exception.
            return [false, exceptionBox[0]];
          }
          // The source returned normally.
          return [true, returned];
        },
      );
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
