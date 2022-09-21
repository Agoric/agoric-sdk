// This package has maxNodeModuleJsDepth=0 to prevent ambient imports.
// A consequence is that types that are only provided ambiently have to be defined.

export type Brand = unknown;
export type Amount = { brand: Brand; value: bigint };
export type Instance = unknown;
export type Proposal = any;
