import { wallets } from '../airdropData/2kwallets.js';
import { formatTestAccounts } from './account.utils.js';

const COSMOS_ACCOUNTS = {
  TWO_THOUSAND_ACCOUNTS: formatTestAccounts(wallets),
  ONE_HUNDRED_ACCOUNTS: formatTestAccounts(wallets.slice(0, 100)),
};

export { COSMOS_ACCOUNTS };
