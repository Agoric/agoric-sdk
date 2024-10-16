export namespace Either {
    export { Right };
    export { Left };
    export { of };
    export { tryCatch };
    export { fromNullable };
    export { fromUndefined };
}
declare function Right(x: any): {
    isLeft: boolean;
    chain: (f: any) => any;
    ap: (other: any) => any;
    alt: (_: any) => any;
    extend: (f: any) => any;
    concat: (other: any) => any;
    traverse: (of: any, f: any) => any;
    map: (f: any) => any;
    fold: (_: any, g: any) => any;
    inspect: () => string;
};
declare function Left(x: any): {
    isLeft: boolean;
    chain: (_: any) => any;
    ap: (_: any) => any;
    extend: (_: any) => any;
    alt: (other: any) => any;
    concat: (_: any) => any;
    traverse: (of: any, _: any) => any;
    map: (_: any) => any;
    fold: (f: any, _: any) => any;
    inspect: () => string;
};
declare function of(x: any): {
    isLeft: boolean;
    chain: (f: any) => any;
    ap: (other: any) => any;
    alt: (_: any) => any;
    extend: (f: any) => any;
    concat: (other: any) => any;
    traverse: (of: any, f: any) => any;
    map: (f: any) => any;
    fold: (_: any, g: any) => any;
    inspect: () => string;
};
declare function tryCatch(f: any): {
    isLeft: boolean;
    chain: (f: any) => any;
    ap: (other: any) => any;
    alt: (_: any) => any;
    extend: (f: any) => any;
    concat: (other: any) => any;
    traverse: (of: any, f: any) => any;
    map: (f: any) => any;
    fold: (_: any, g: any) => any;
    inspect: () => string;
} | {
    isLeft: boolean;
    chain: (_: any) => any;
    ap: (_: any) => any;
    extend: (_: any) => any;
    alt: (other: any) => any;
    concat: (_: any) => any;
    traverse: (of: any, _: any) => any;
    map: (_: any) => any;
    fold: (f: any, _: any) => any;
    inspect: () => string;
};
declare function fromNullable(x: any): {
    isLeft: boolean;
    chain: (f: any) => any;
    ap: (other: any) => any;
    alt: (_: any) => any;
    extend: (f: any) => any;
    concat: (other: any) => any;
    traverse: (of: any, f: any) => any;
    map: (f: any) => any;
    fold: (_: any, g: any) => any;
    inspect: () => string;
} | {
    isLeft: boolean;
    chain: (_: any) => any;
    ap: (_: any) => any;
    extend: (_: any) => any;
    alt: (other: any) => any;
    concat: (_: any) => any;
    traverse: (of: any, _: any) => any;
    map: (_: any) => any;
    fold: (f: any, _: any) => any;
    inspect: () => string;
};
declare function fromUndefined(x: any): {
    isLeft: boolean;
    chain: (f: any) => any;
    ap: (other: any) => any;
    alt: (_: any) => any;
    extend: (f: any) => any;
    concat: (other: any) => any;
    traverse: (of: any, f: any) => any;
    map: (f: any) => any;
    fold: (_: any, g: any) => any;
    inspect: () => string;
} | {
    isLeft: boolean;
    chain: (_: any) => any;
    ap: (_: any) => any;
    extend: (_: any) => any;
    alt: (other: any) => any;
    concat: (_: any) => any;
    traverse: (of: any, _: any) => any;
    map: (_: any) => any;
    fold: (f: any, _: any) => any;
    inspect: () => string;
};
export {};
//# sourceMappingURL=adts.d.ts.map