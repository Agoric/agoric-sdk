import type { BootstrapManifestPermit } from '@agoric/vats/src/core/lib-boot.js';

export const orchPermit = {
  localchain: true,
  cosmosInterchainService: true,
  chainStorage: true,
  chainTimerService: true,
  agoricNames: true,

  // for publishing Brands and other remote object references
  board: true,

  // limited distribution during MN2: contract installation
  startUpgradable: true,
  zoe: true, // only getTerms() is needed. XXX should be split?
} as const satisfies BootstrapManifestPermit;
harden(orchPermit);
