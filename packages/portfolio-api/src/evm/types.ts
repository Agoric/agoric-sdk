export type PortfolioPath =
  `published.ymax${0 | 1}.portfolios.portfolio${number}`;

export type EIPMessageUpdate =
  | {
      updated: 'messageUpdate';
      nonce: bigint;
      status: 'pending';
    }
  | {
      updated: 'messageUpdate';
      nonce: bigint;
      error: string;
      status: 'error';
    }
  | {
      updated: 'messageUpdate';
      nonce: bigint;
      status: 'ok';
    };

export type EVMWalletUpdate = EIPMessageUpdate | never;
