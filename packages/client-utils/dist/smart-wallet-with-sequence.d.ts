/**
 * @file Smart wallet wrapper with queue-based transaction sequence management
 */
import type { SigningSmartWalletKit } from './signing-smart-wallet-kit.js';
import type { TxSequencer } from './sequence-manager.js';
/**
 * Make a SigningSmartWalletKit with automatic management of outbound
 * transaction sequencing:
 * - Queue-based transaction serialization to prevent sequence conflicts
 * - Automatic error recovery for sequence mismatches
 * - Network sync on sequence errors with retry logic
 *
 * @alpha
 */
export declare const makeSequencingSmartWallet: (signingSmartWalletKit: SigningSmartWalletKit, txSequencer: TxSequencer, { log }: {
    log?: (...args: unknown[]) => void;
}) => SigningSmartWalletKit;
//# sourceMappingURL=smart-wallet-with-sequence.d.ts.map