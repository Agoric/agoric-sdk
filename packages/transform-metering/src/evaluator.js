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

  return (meter, srcOrThunk, endowments = {}, whenQuiesced = undefined) => {
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
        endowments.getGlobalMeter = m =>
          m === true ? meter : replaceGlobalMeter(m);
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
}
