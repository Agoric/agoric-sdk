/**
 * @file Constants and configuration for portfolio contract deployment
 *
 * This module exports domain knowledge about portfolio contract deployment,
 * including wallet store keys, control addresses, and contract names.
 */

/**
 * Wallet store key where the contract control facet is delivered
 * @type {string}
 */
export const YMAX_CONTROL_WALLET_KEY = 'ymaxControl';

/**
 * Known portfolio contract names in agoricNames.instance
 * @type {readonly ['ymax0', 'ymax1']}
 */
export const PORTFOLIO_CONTRACT_NAMES = /** @type {const} */ ([
  'ymax0',
  'ymax1',
]);

/**
 * Control account addresses per contract and network
 * Source: https://www.mintscan.io/agoric/proposals/111 (for ymax0/main)
 *
 * @type {{
 *   ymax0: {
 *     main: string;
 *     devnet: string;
 *   };
 *   ymax1: {
 *     main: string;
 *     devnet: string;
 *   };
 * }}
 */
export const CONTROL_ADDRESSES = {
  ymax0: {
    main: 'agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq',
    devnet: 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
  },
  ymax1: {
    main: 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928',
    devnet: 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928', // TODO: verify devnet address
  },
};

/**
 * Get the control address for a contract on a specific network
 *
 * @param {typeof PORTFOLIO_CONTRACT_NAMES[number]} contractName
 * @param {'main' | 'devnet'} network
 * @returns {string} The control account address
 * @throws {Error} If contract or network is invalid
 */
export const getControlAddress = (contractName, network) => {
  if (!PORTFOLIO_CONTRACT_NAMES.includes(contractName)) {
    throw new Error(
      `Invalid contract name: ${contractName}. Must be one of: ${PORTFOLIO_CONTRACT_NAMES.join(', ')}`,
    );
  }
  if (network !== 'main' && network !== 'devnet') {
    throw new Error(`Invalid network: ${network}. Must be 'main' or 'devnet'`);
  }

  return CONTROL_ADDRESSES[contractName][network];
};

/**
 * Validate that a contract name is a known portfolio contract
 *
 * @param {string} name
 * @returns {name is typeof PORTFOLIO_CONTRACT_NAMES[number]}
 */
export const isPortfolioContract = name => {
  return PORTFOLIO_CONTRACT_NAMES.includes(
    /** @type {typeof PORTFOLIO_CONTRACT_NAMES[number]} */ (name),
  );
};
