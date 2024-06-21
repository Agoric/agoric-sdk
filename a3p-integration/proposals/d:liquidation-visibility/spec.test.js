export const Liquidation = {
  setup: {
    // Vaults are sorted in the worst debt/col ratio to the best
    vaults: [
      {
        collateral: 15,
        ist: 105,
        debt: 105.525,
      },
      {
        collateral: 15,
        ist: 103,
        debt: 103.515,
      },
      {
        collateral: 15,
        ist: 100,
        debt: 100.5,
      },
    ],
    bids: [
      {
        give: '80IST',
        discount: 10,
      },
      {
        give: '90IST',
        price: 9.0,
      },
      {
        give: '150IST',
        discount: 15,
      },
    ],
    price: {
      starting: 12.34,
      trigger: 9.99,
    },
    auction: {
      start: {
        collateral: 45,
        debt: 309.54,
      },
      end: {
        collateral: 9.659301,
        debt: 0,
      },
    },
  },
  outcome: {
    reserve: {
      allocations: {
        ATOM: 0.309852,
        STARS: 0.309852,
      },
      shortfall: 0,
      minted: 0,
    },
    // The order in the setup preserved
    vaults: [
      {
        locked: 2.846403,
      },
      {
        locked: 3.0779,
      },
      {
        locked: 3.425146,
      },
    ],
    remaining: {
      collateral: 0,
    },
    penalty: 0.30985,
  },
};
