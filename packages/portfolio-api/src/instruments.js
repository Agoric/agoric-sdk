/**
 * Mnemonic IDs for supported financial instruments in which a portfolio can use
 * assets to take a position.
 *
 * Treat these identifers as opaque strings. There are separate data structures
 * to map them to functional interfaces for interoperation.
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
  USDN: 'USDN',
  USDNVault: 'USDNVault',
});
harden(InstrumentId);
