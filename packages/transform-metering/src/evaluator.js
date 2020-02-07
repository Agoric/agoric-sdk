import { makeWithMeter } from './with';
import { makeMeterAndResetters } from './meter';
import { makeMeteringTransformer } from './transform';

export function makeMeteredEvaluator({
  setGlobalMeter,
  makeEvaluator,
  babelCore,
  maxima,
}) {
  const [meter, reset] = makeMeterAndResetters(maxima);
  const { meterId, meteringTransform } = makeMeteringTransformer(babelCore);
  const transforms = [meteringTransform];
  const { withMeter } = makeWithMeter(setGlobalMeter, meter);

  const ev = makeEvaluator({ transforms });

  return (src, endowments = {}) => {
    // Reset all meters to their defaults.
    Object.values(reset).forEach(r => r());
    endowments[meterId] = meter;
    let exhausted = true;
    let returned;
    let exceptionBox = false;
    try {
      // Evaluate the source with the meter.
      returned = withMeter(() => ev.evaluate(src, { [meterId]: meter }));
      exhausted = false;
    } catch (e) {
      exceptionBox = [e];
      exhausted = reset.isExhausted();
    }
    return {
      exhausted,
      returned,
      exceptionBox,
    };
  };
}
