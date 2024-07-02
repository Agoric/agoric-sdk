// @ts-check
import { Far } from '@endo/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { TimeMath } from '@agoric/time';

export const start = async zcf => {
    const { startValue, timeStep } = zcf.getTerms();

    const manualTimer = buildManualTimer(console.log, startValue, timeStep);

    const advanceTimeHandler = async (seat, offerArgs) => {
        const { timestamp: timeRaw } = offerArgs;
        const timestamp = TimeMath.coerceTimestampRecord(timeRaw, manualTimer.getTimerBrand());
        await manualTimer.advanceTo(timestamp, 'New Time');
        return `Time advanced to ${timestamp}`;
    };

    const advanceTimeByHandler = async (seat, offerArgs) => {
      const { duration } = offerArgs;
      const timeBlock = TimeMath.coerceRelativeTimeRecord(duration, manualTimer.getTimerBrand());

      manualTimer.advanceBy(timeBlock, `Advance time by ${timeBlock.relValue}`);

      return 'Successfully advanced the time progressively';
    }

    const creatorFacet = Far('creatorFacet', {});

    const publicFacet = Far('publicFacet', {
        getManualTimer: () => manualTimer,
        getCurrentTimestamp: () => manualTimer.getCurrentTimestamp(),
        makeAdvanceTimeInvitation: () => zcf.makeInvitation(advanceTimeHandler, 'advanceTimeHandler'),
        makeAdvanceTimeStepByStepInvitation: () => zcf.makeInvitation(advanceTimeByHandler, 'advanceTimeByHandler'),
    });

    return harden({ creatorFacet, publicFacet });
};
