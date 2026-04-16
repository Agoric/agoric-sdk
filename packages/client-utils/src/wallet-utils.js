/** @file backwards compat */

import { makeSmartWalletKit } from './smart-wallet-kit.js';

/** @import {SmartWalletKit} from './smart-wallet-kit.js';  */

/** @deprecated use `makeSmartWalletKit` */
export const makeWalletUtils = makeSmartWalletKit;
