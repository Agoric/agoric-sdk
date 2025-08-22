export const options = /** @type {const} */ ({
  slots: [],
  structure: {
    axelarConfig: {
      Arbitrum: {
        axelarId: 'arbitrum-sepolia',
        chainInfo: {
          cctpDestinationDomain: 3,
          namespace: 'eip155',
          reference: '421614',
        },
        contracts: {
          aavePool: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
          usdc: '0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557',
        },
      },
      Avalanche: {
        axelarId: 'Avalanche',
        chainInfo: {
          cctpDestinationDomain: 1,
          namespace: 'eip155',
          reference: '43113',
        },
        contracts: {
          aavePool: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0',
          usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
        },
      },
      Binance: {
        axelarId: 'binance',
        chainInfo: {
          namespace: 'eip155',
          reference: '97',
        },
        contracts: {
          aavePool: '0x',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0x',
          usdc: '0x',
        },
      },
      Ethereum: {
        axelarId: 'ethereum-sepolia',
        chainInfo: {
          cctpDestinationDomain: 0,
          namespace: 'eip155',
          reference: '11155111',
        },
        contracts: {
          aavePool: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
          usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        },
      },
      Fantom: {
        axelarId: 'Fantom',
        chainInfo: {
          namespace: 'eip155',
          reference: '4002',
        },
        contracts: {
          aavePool: '0x',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0x',
          usdc: '0x',
        },
      },
      Optimism: {
        axelarId: 'optimism-sepolia',
        chainInfo: {
          cctpDestinationDomain: 2,
          namespace: 'eip155',
          reference: '11155420',
        },
        contracts: {
          aavePool: '0xb50201558B00496A145fE76f7424749556E326D8',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
          usdc: '0x4200000000000000000000000000000000000042',
        },
      },
      Polygon: {
        axelarId: 'polygon-sepolia',
        chainInfo: {
          cctpDestinationDomain: 7,
          namespace: 'eip155',
          reference: '80002',
        },
        contracts: {
          aavePool: '0x',
          compound: '0x',
          factory: '0x',
          tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
          usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        },
      },
    },
  },
});

export const customManifest = {
  startPortfolio: {
    brand: {},
    consume: {
      agoricNames: true,
      board: true,
      chainInfoPublished: true,
      chainStorage: true,
      chainTimerService: true,
      cosmosInterchainService: true,
      localchain: true,
      startUpgradable: true,
      zoe: true,
    },
    installation: {
      consume: {
        ymax0: true,
      },
    },
    instance: {
      produce: {
        ymax0: true,
      },
    },
    issuer: {
      consume: {
        BLD: true,
        PoC26: true,
        USDC: true,
      },
    },
    produce: {
      ymax0Kit: true,
    },
  },
};
