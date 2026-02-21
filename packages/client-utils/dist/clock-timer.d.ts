export function makeIntervalIterable(intervalMs: number, { setTimeout, clearTimeout, now }: IntervalIO): {
    [Symbol.asyncIterator]: () => AsyncGenerator<number, void, void>;
};
export type IntervalIO = {
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
    now: typeof Date.now;
};
//# sourceMappingURL=clock-timer.d.ts.map