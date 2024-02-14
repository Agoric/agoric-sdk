// XXX retrofits for type deficiencies in external packages

declare module '@endo/nat' {
  export function Nat(specimen: unknown): bigint;
  export function isNat(specimen: unknown): boolean;
}
