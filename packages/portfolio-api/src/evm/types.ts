import type { PureData } from '@endo/pass-style';

export type PortfolioPath =
  `published.ymax${0 | 1}.portfolios.portfolio${number}`;

type EIPCommonMessageUpdate = {
  updated: 'messageUpdate';
  nonce: bigint;
  deadline: bigint;
};

export type EIPMessageUpdate = EIPCommonMessageUpdate &
  (
    | {
        status: 'pending';
      }
    | {
        status: 'error';
        error: string;
      }
    | {
        status: 'ok';
        result: PureData;
      }
  );

export type EVMWalletUpdate = EIPMessageUpdate | never;
