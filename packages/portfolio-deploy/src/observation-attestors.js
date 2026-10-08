/**
 * @file Addresses of the EOA of the observation service (the attestor), which
 * signs the portfolio observations that agent-submitted plans are checked
 * against, by ymax instance and network.
 */

/**
 * Placeholder until the observation service's keys are provisioned: nobody
 * holds the key of this address, so any signed observations are rejected.
 */
const PLACEHOLDER_ATTESTOR = '0x000000000000000000000000000000000000dEaD';

/**
 * Instances deployed through `ymaxControl` get theirs from the private args
 * overrides (see `test/privateArgs-ymax*.json`), which must agree with these.
 *
 * @type {{
 *   ymax0: Record<'mainnet' | 'testnet', `0x${string}`>;
 *   ymax1: Record<'mainnet', `0x${string}`>;
 * }}
 */
export const observationAttestors = harden({
  ymax0: { mainnet: PLACEHOLDER_ATTESTOR, testnet: PLACEHOLDER_ATTESTOR },
  ymax1: { mainnet: PLACEHOLDER_ATTESTOR },
});
