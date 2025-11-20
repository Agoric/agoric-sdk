import type { Hex } from 'viem';

export type WalletArtifact = {
  /**
   * Raw creation bytecode for the Wallet contract (constructor args excluded).
   * TODO(#create2-provisioning): Replace placeholder with the compiled bytecode artifact.
   */
  bytecode: Hex;
};

export const WALLET_ARTIFACT: WalletArtifact = {
  // Placeholder until the canonical Wallet artifact is wired in.
  bytecode: '0x',
};
