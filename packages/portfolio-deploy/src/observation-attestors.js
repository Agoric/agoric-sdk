/**
 * @file Addresses of the EOA of the observation service (the attestor), which
 * signs the portfolio observations that agent-submitted plans are checked
 * against, by ymax instance and network.
 */

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
  ymax0: {
    mainnet: '0x0EBa3dDE817375354CdE3d05D3c97a72B0AAf8BB',
    testnet: '0x000000000000000000000000000000000000dEaD',
  },
  ymax1: { mainnet: '0xFE5CC60b9F6bc06004e3c8169BB7460DdD70c7a9' },
});
