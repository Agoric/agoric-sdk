/**
 * Mnemonic IDs for supported financial instruments in which a portfolio can use
 * assets to take a position.
 *
 * These identifiers are to be treated as opaque strings, but must not start
 * with punctuation that could result in them being misinterpreted as any other
 * kind of {@link AssetPlaceRef} (e.g., a `<`-prefixed {@link SeatKeyword} or
 * `@`-prefixed {@link InterChainAccountRef}), and in fact must start with an
 * ASCII letter unless the implementation of {@link isInstrumentId} is relaxed.
 * There are separate data structures to map them to functional interfaces for
 * interoperation.
 *
 * @enum {(typeof InstrumentId)[keyof typeof InstrumentId]}
 */
export const InstrumentId = /** @type {const} */ ({
  Aave_Arbitrum: 'Aave_Arbitrum',
  Aave_Avalanche: 'Aave_Avalanche',
  Aave_Base: 'Aave_Base',
  Aave_Ethereum: 'Aave_Ethereum',
  Aave_Optimism: 'Aave_Optimism',
  Beefy_compoundUsdc_Arbitrum: 'Beefy_compoundUsdc_Arbitrum',
  Beefy_compoundUsdc_Optimism: 'Beefy_compoundUsdc_Optimism',
  Beefy_morphoGauntletUsdc_Ethereum: 'Beefy_morphoGauntletUsdc_Ethereum',
  Beefy_morphoSeamlessUsdc_Base: 'Beefy_morphoSeamlessUsdc_Base',
  Beefy_morphoSmokehouseUsdc_Ethereum: 'Beefy_morphoSmokehouseUsdc_Ethereum',
  Beefy_re7_Avalanche: 'Beefy_re7_Avalanche',
  Compound_Arbitrum: 'Compound_Arbitrum',
  Compound_Base: 'Compound_Base',
  Compound_Ethereum: 'Compound_Ethereum',
  Compound_Optimism: 'Compound_Optimism',
  ERC4626_vaultU2_Ethereum: 'ERC4626_vaultU2_Ethereum',
  ERC4626_morphoClearstarHighYieldUsdc_Ethereum:
    'ERC4626_morphoClearstarHighYieldUsdc_Ethereum',
  ERC4626_morphoClearstarUsdcCore_Ethereum:
    'ERC4626_morphoClearstarUsdcCore_Ethereum',
  ERC4626_morphoGauntletUsdcRwa_Ethereum:
    'ERC4626_morphoGauntletUsdcRwa_Ethereum',
  ERC4626_morphoSteakhouseHighYieldInstant_Ethereum:
    'ERC4626_morphoSteakhouseHighYieldInstant_Ethereum',
  ERC4626_morphoClearstarInstitutionalUsdc_Ethereum:
    'ERC4626_morphoClearstarInstitutionalUsdc_Ethereum',
  ERC4626_morphoClearstarUsdcReactor_Ethereum:
    'ERC4626_morphoClearstarUsdcReactor_Ethereum',
  ERC4626_morphoAlphaUsdcCore_Ethereum: 'ERC4626_morphoAlphaUsdcCore_Ethereum',
  ERC4626_morphoResolvUsdc_Ethereum: 'ERC4626_morphoResolvUsdc_Ethereum',
  ERC4626_morphoGauntletUsdcFrontier_Ethereum:
    'ERC4626_morphoGauntletUsdcFrontier_Ethereum',
  ERC4626_morphoHyperithmUsdcMidcurve_Ethereum:
    'ERC4626_morphoHyperithmUsdcMidcurve_Ethereum',
  ERC4626_morphoHyperithmUsdcDegen_Ethereum:
    'ERC4626_morphoHyperithmUsdcDegen_Ethereum',
  ERC4626_morphoGauntletUsdcCore_Ethereum:
    'ERC4626_morphoGauntletUsdcCore_Ethereum',
  ERC4626_morphoSteakhousePrimeUsdc_Base:
    'ERC4626_morphoSteakhousePrimeUsdc_Base',
  ERC4626_morphoSteakhouseUsdc_Base: 'ERC4626_morphoSteakhouseUsdc_Base',
  ERC4626_morphoGauntletUsdcPrime_Base: 'ERC4626_morphoGauntletUsdcPrime_Base',
  ERC4626_morphoSeamlessUsdcVault_Base: 'ERC4626_morphoSeamlessUsdcVault_Base',
  ERC4626_morphoSteakhouseHighYieldUsdc_Arbitrum:
    'ERC4626_morphoSteakhouseHighYieldUsdc_Arbitrum',
  ERC4626_morphoGauntletUsdcCore_Arbitrum:
    'ERC4626_morphoGauntletUsdcCore_Arbitrum',
  ERC4626_morphoHyperithmUsdc_Arbitrum: 'ERC4626_morphoHyperithmUsdc_Arbitrum',
  ERC4626_morphoGauntletUsdcPrime_Optimism:
    'ERC4626_morphoGauntletUsdcPrime_Optimism',
  USDN: 'USDN',
  USDNVault: 'USDNVault',
});
harden(InstrumentId);
