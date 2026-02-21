/** buf:lint:ignore ENUM_VALUE_PREFIX */
export declare enum Algorithm {
    /** UNSPECIFIED - buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX */
    UNSPECIFIED = 0,
    STABLESWAP = 1,
    PERFECTPRICE = 2,
    UNRECOGNIZED = -1
}
export declare const AlgorithmSDKType: typeof Algorithm;
export declare function algorithmFromJSON(object: any): Algorithm;
export declare function algorithmToJSON(object: Algorithm): string;
//# sourceMappingURL=algorithm.d.ts.map