import type { start } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { CorePowersG } from './orch.start.types.js';
import type {
  name as contractName,
  permit,
} from './portfolio.contract.permit.js';

export type StartFn = typeof start;
export type PortfolioBootPowers = CorePowersG<
  typeof contractName,
  StartFn,
  typeof permit
> & { issuer: { consume: { USDC: Promise<Issuer>; PoC26: Promise<Issuer> } } };
