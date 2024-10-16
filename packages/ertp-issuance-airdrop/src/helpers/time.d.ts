export namespace TimeIntervals {
    let SECONDS: object;
    let MILLISECONDS: object;
}
export function makeCancelTokenMaker(name: any, startCount?: number): () => import("@endo/pass-style").RemotableObject<`Alleged: ${string}`> & import("@endo/eventual-send").RemotableBrand<{}, {}>;
export function makeWaker(name: any, func: any): {
    wake: (timestamp: any) => any;
} & import("@endo/pass-style").RemotableObject<`Alleged: ${string}`> & import("@endo/eventual-send").RemotableBrand<{}, {
    wake: (timestamp: any) => any;
}>;
/**
 * Represents the number of seconds in one day.
 *
 * @constant {bigint}
 */
export const oneDay: any;
/**
 * Represents the number of seconds in one week.
 *
 * @constant {bigint}
 */
export const oneWeek: any;
/**
 * Represents the number one thousand as a BigInt.
 *
 * @constant {bigint}
 */
export const ONE_THOUSAND: 1000n;
/**
 * Represents the number sixty as a BigInt.
 *
 * @constant {bigint}
 */
export const SIXTY: 60n;
//# sourceMappingURL=time.d.ts.map