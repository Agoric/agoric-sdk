import { start } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { CorePowersG } from './orch.start.types.js';
import {
  name as contractName,
  type permit,
} from './portfolio.contract.permit.js';

export type StartFn = typeof start;
export type PortfolioBootPowers = CorePowersG<
  typeof contractName,
  StartFn,
  typeof permit
> & { issuer: { consume: { BLD: Promise<Issuer> } } };
