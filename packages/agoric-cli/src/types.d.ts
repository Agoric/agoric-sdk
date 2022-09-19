// This package has maxNodeModuleJsDepth=0 to prevent ambient imports.
// A consequence is that types that are only provided ambiently have to be defined.

export { Amount, Brand, Proposal } from '@agoric/ertp/src/types-module';

export type Instance = unknown;
