import type { CosmosAssetInfo } from '../src/cosmos-api.js';

// https://github.com/cosmos/chain-registry/blob/master/cosmoshub/assetlist.json
export const assets: Record<string, CosmosAssetInfo[]> = {
  cosmoshub: [
    {
      description:
        'ATOM is the native cryptocurrency of the Cosmos network, designed to facilitate interoperability between multiple blockchains through its innovative hub-and-spoke model.',
      extended_description:
        "ATOM, the native cryptocurrency of the Cosmos network, is essential for achieving the project's goal of creating an 'Internet of Blockchains.' Launched in 2019, Cosmos aims to solve the scalability, usability, and interoperability issues prevalent in existing blockchain ecosystems. The Cosmos Hub, the central blockchain of the network, uses ATOM for transaction fees, staking, and governance. By staking ATOM, users can earn rewards and participate in governance, influencing decisions on network upgrades and changes.\n\nCosmos leverages the Tendermint consensus algorithm to achieve high transaction throughput and fast finality. Its Inter-Blockchain Communication (IBC) protocol enables seamless data and value transfer between different blockchains, fostering a highly interconnected and collaborative ecosystem. The flexibility and scalability offered by Cosmos have attracted numerous projects, enhancing its utility and adoption. ATOM's role in securing the network and facilitating governance underscores its importance in the broader blockchain landscape.",
      denom_units: [
        {
          denom: 'uatom',
          exponent: 0,
        },
        {
          denom: 'atom',
          exponent: 6,
        },
      ],
      base: 'uatom',
      name: 'Cosmos Hub Atom',
      display: 'atom',
      symbol: 'ATOM',
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg',
      },
      coingecko_id: 'cosmos',
      images: [
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg',
          theme: {
            primary_color_hex: '#272d45',
          },
        },
      ],
      socials: {
        website: 'https://cosmos.network',
        twitter: 'https://twitter.com/cosmoshub',
      },
    },
    {
      description: 'Tether USDt on the Cosmos Hub',
      denom_units: [
        {
          denom:
            'ibc/F04D72CF9B5D9C849BB278B691CDFA2241813327430EC9CDC83F8F4CA4CDC2B0',
          exponent: 0,
        },
        {
          denom: 'usdt',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/F04D72CF9B5D9C849BB278B691CDFA2241813327430EC9CDC83F8F4CA4CDC2B0',
      name: 'Tether USDt',
      display: 'usdt',
      symbol: 'USDt',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'kava',
            base_denom: 'erc20/tether/usdt',
            channel_id: 'channel-0',
          },
          chain: {
            channel_id: 'channel-277',
            path: 'transfer/channel-277/erc20/tether/usdt',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'kava',
            base_denom: 'erc20/tether/usdt',
          },
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/ethereum/images/usdt.svg',
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/ethereum/images/usdt.png',
          theme: {
            circle: true,
            primary_color_hex: '#009393',
            background_color_hex: '#009393',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/ethereum/images/usdt.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/ethereum/images/usdt.svg',
      },
    },
    {
      description: 'FX on Cosmos Hub',
      denom_units: [
        {
          denom:
            'ibc/4925E6ABA571A44D2BE0286D2D29AF42A294D0FF2BB16490149A1B26EAD33729',
          exponent: 0,
          aliases: ['FX'],
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/4925E6ABA571A44D2BE0286D2D29AF42A294D0FF2BB16490149A1B26EAD33729',
      name: 'Function X',
      display: 'FX',
      symbol: 'FX',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'fxcore',
            base_denom: 'FX',
            channel_id: 'channel-10',
          },
          chain: {
            channel_id: 'channel-585',
            path: 'transfer/channel-585/FX',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'fxcore',
            base_denom: 'FX',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/fxcore/images/fx.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/fxcore/images/fx.svg',
          theme: {
            primary_color_hex: '#1c1c1c',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/fxcore/images/fx.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/fxcore/images/fx.svg',
      },
    },
  ],
  noble: [
    {
      description: 'The permissioned staking asset for Noble Chain',
      denom_units: [
        {
          denom: 'ustake',
          exponent: 0,
          aliases: ['microstake'],
        },
        {
          denom: 'stake',
          exponent: 6,
        },
      ],
      base: 'ustake',
      name: 'Stake',
      display: 'stake',
      symbol: 'STAKE',
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/stake.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/stake.svg',
      },
      images: [
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/stake.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/stake.svg',
          theme: {
            primary_color_hex: '#a8bbfb',
          },
        },
      ],
    },
    {
      description:
        'Frienzies are an IBC token redeemable exclusively for a physical asset issued by the Noble entity.',
      denom_units: [
        {
          denom: 'ufrienzies',
          exponent: 0,
          aliases: ['microfrienzies'],
        },
        {
          denom: 'frienzies',
          exponent: 6,
        },
      ],
      base: 'ufrienzies',
      display: 'frienzies',
      name: 'Frienzies',
      symbol: 'FRNZ',
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/frnz.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/frnz.svg',
      },
      images: [
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/frnz.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/frnz.svg',
          theme: {
            primary_color_hex: '#04041c',
          },
        },
      ],
    },
    {
      description: 'ATOM token on Noble',
      denom_units: [
        {
          denom:
            'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0',
          exponent: 0,
        },
        {
          denom: 'atom',
          exponent: 6,
          aliases: ['ATOM'],
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0',
      name: 'Atom Staking Coin',
      display: 'atom',
      symbol: 'ATOM',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'cosmoshub',
            base_denom: 'uatom',
            channel_id: 'channel-536',
          },
          chain: {
            channel_id: 'channel-4',
            path: 'transfer/channel-4/uatom',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg',
      },
      images: [
        {
          image_sync: {
            chain_name: 'cosmoshub',
            base_denom: 'uatom',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg',
          theme: {
            primary_color_hex: '#272d45',
          },
        },
      ],
    },
    {
      description: 'USD Coin',
      denom_units: [
        {
          denom: 'uusdc',
          exponent: 0,
          aliases: ['microusdc'],
        },
        {
          denom: 'usdc',
          exponent: 6,
        },
      ],
      base: 'uusdc',
      display: 'usdc',
      name: 'USDC',
      symbol: 'USDC',
      coingecko_id: 'usd-coin',
      traces: [
        {
          type: 'additional-mintage',
          counterparty: {
            chain_name: 'ethereum',
            base_denom: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          },
          provider: 'Circle',
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/USDCoin.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/USDCoin.svg',
      },
      images: [
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/USDCoin.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/USDCoin.svg',
          theme: {
            primary_color_hex: '#2474cc',
          },
        },
      ],
    },
    {
      description: 'Ondo US Dollar Yield',
      extended_description:
        'USDY is a tokenized note secured by short-term US Treasuries and bank demand deposits. USDY is accessible to non-US individual and institutional investors and is transferable onchain 40-50 days after purchase.',
      denom_units: [
        {
          denom: 'ausdy',
          exponent: 0,
          aliases: ['attousdy'],
        },
        {
          denom: 'usdy',
          exponent: 18,
        },
      ],
      base: 'ausdy',
      display: 'usdy',
      name: 'Ondo US Dollar Yield',
      symbol: 'USDY',
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/usdy.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/usdy.svg',
      },
      images: [
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/usdy.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/noble/images/usdy.svg',
          theme: {
            primary_color_hex: '#142c5c',
          },
        },
      ],
      coingecko_id: 'ondo-us-dollar-yield',
      socials: {
        website: 'https://ondo.finance/usdy',
        twitter: 'https://x.com/OndoFinance',
      },
    },
  ],
  omniflixhub: [
    {
      description:
        'OmniFlix is a decentralized media platform that enables content creators to distribute, monetize, and manage their digital content using blockchain technology.',
      extended_description:
        "OmniFlix is a decentralized media platform designed to empower content creators by providing tools for the distribution, monetization, and management of digital content. By leveraging blockchain technology, OmniFlix ensures that creators retain control over their work, allowing for direct interactions with their audience and transparent revenue streams. The platform supports various media types, including video, audio, and text, enabling creators to reach a wide audience. OmniFlix's native token is used for transactions, staking, and governance, incentivizing users to participate in the platform's ecosystem and contribute to its growth and development. The platform aims to revolutionize the media industry by offering a decentralized alternative to traditional content distribution models.",
      denom_units: [
        {
          denom: 'uflix',
          exponent: 0,
        },
        {
          denom: 'flix',
          exponent: 6,
        },
      ],
      base: 'uflix',
      name: 'Flix',
      display: 'flix',
      symbol: 'FLIX',
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/images/flix.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/images/flix.svg',
      },
      coingecko_id: 'omniflix-network',
      images: [
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/images/flix.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/omniflixhub/images/flix.svg',
          theme: {
            primary_color_hex: '#c33635',
          },
        },
      ],
      socials: {
        website: 'https://omniflix.network/',
        twitter: 'https://twitter.com/OmniFlixNetwork',
      },
    },
    {
      denom_units: [
        {
          denom:
            'ibc/A8C2D23A1E6F95DA4E48BA349667E322BD7A6C996D8A4AAE8BA72E190F3D1477',
          exponent: 0,
          aliases: ['uatom'],
        },
        {
          denom: 'atom',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/A8C2D23A1E6F95DA4E48BA349667E322BD7A6C996D8A4AAE8BA72E190F3D1477',
      name: 'Cosmos Hub Atom',
      display: 'atom',
      symbol: 'ATOM',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'cosmoshub',
            base_denom: 'uatom',
            channel_id: 'channel-306',
          },
          chain: {
            channel_id: 'channel-12',
            path: 'transfer/channel-12/uatom',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'cosmoshub',
            base_denom: 'uatom',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg',
          theme: {
            primary_color_hex: '#272d45',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.svg',
      },
    },
    {
      denom_units: [
        {
          denom:
            'ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B',
          exponent: 0,
          aliases: ['uosmo'],
        },
        {
          denom: 'osmo',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B',
      name: 'Osmosis osmo',
      display: 'osmo',
      symbol: 'OSMO',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'osmosis',
            base_denom: 'uosmo',
            channel_id: 'channel-199',
          },
          chain: {
            channel_id: 'channel-1',
            path: 'transfer/channel-1/uosmo',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'osmosis',
            base_denom: 'uosmo',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.svg',
          theme: {
            primary_color_hex: '#760dbb',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.svg',
      },
    },
    {
      denom_units: [
        {
          denom:
            'ibc/43D3010F4CA111744AC8B68E460BC95E565C32928A267FA2B30609C04C10B274',
          exponent: 0,
          aliases: ['uist'],
        },
        {
          denom: 'ist',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/43D3010F4CA111744AC8B68E460BC95E565C32928A267FA2B30609C04C10B274',
      name: 'Agoric IST (Inter Stable Token)',
      display: 'ist',
      symbol: 'IST',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'agoric',
            base_denom: 'uist',
            channel_id: 'channel-58',
          },
          chain: {
            channel_id: 'channel-30',
            path: 'transfer/channel-30/uist',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'agoric',
            base_denom: 'uist',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/agoric/images/ist.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/agoric/images/ist.svg',
          theme: {
            primary_color_hex: '#d485e2',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/agoric/images/ist.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/agoric/images/ist.svg',
      },
    },
    {
      denom_units: [
        {
          denom:
            'ibc/AC4C84DD7D3732CFA95A420247FAD5179BE4F42E5635E2BF0A62C67E2E2FA4A9',
          exponent: 0,
          aliases: ['uusdc'],
        },
        {
          denom: 'usdc',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/AC4C84DD7D3732CFA95A420247FAD5179BE4F42E5635E2BF0A62C67E2E2FA4A9',
      name: 'USD Coin (Axelar)',
      display: 'usdc',
      symbol: 'USDC.axl',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'axelar',
            base_denom: 'uusdc',
            channel_id: 'channel-77',
          },
          chain: {
            channel_id: 'channel-27',
            path: 'transfer/channel-27/uusdc',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'axelar',
            base_denom: 'uusdc',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/images/usdc.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/images/usdc.svg',
          theme: {
            primary_color_hex: '#2474cc',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/images/usdc.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/images/usdc.svg',
      },
    },
    {
      description:
        "Akash Token (AKT) is the Akash Network's native utility token",
      denom_units: [
        {
          denom:
            'ibc/6901B45BC2C5418ED8B3C3C9F9A641A3DAF2D234230AFA9DF32D8F9F9434721C',
          exponent: 0,
          aliases: ['uakt'],
        },
        {
          denom: 'akt',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/6901B45BC2C5418ED8B3C3C9F9A641A3DAF2D234230AFA9DF32D8F9F9434721C',
      name: 'Akash',
      display: 'akt',
      symbol: 'AKT',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'akash',
            base_denom: 'uakt',
            channel_id: 'channel-61',
          },
          chain: {
            channel_id: 'channel-25',
            path: 'transfer/channel-25/uakt',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.svg',
      },
      images: [
        {
          image_sync: {
            chain_name: 'akash',
            base_denom: 'uakt',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.svg',
          theme: {
            primary_color_hex: '#bc342c',
          },
        },
      ],
    },
    {
      denom_units: [
        {
          denom:
            'ibc/9F28238BDB687A86681B30764BA1437E079C3565D04FDD7862055A83F7E5C630',
          exponent: 0,
        },
        {
          denom: 'baddog',
          exponent: 6,
        },
      ],
      type_asset: 'ics20',
      base: 'ibc/9F28238BDB687A86681B30764BA1437E079C3565D04FDD7862055A83F7E5C630',
      name: 'BadDog (Osmosis)',
      display: 'baddog',
      symbol: 'BADDOG.osmo',
      traces: [
        {
          type: 'ibc',
          counterparty: {
            chain_name: 'osmosis',
            base_denom:
              'ibc/2FFE07C4B4EFC0DDA099A16C6AF3C9CCA653CC56077E87217A585D48794B0BC7',
            channel_id: 'channel-199',
          },
          chain: {
            channel_id: 'channel-1',
            path: 'transfer/channel-1/transfer/channel-113/factory/chihuahua1x4q2vkrz4dfgd9hcw0p5m2f2nuv2uqmt9xr8k2/achihuahuawifhat',
          },
        },
      ],
      images: [
        {
          image_sync: {
            chain_name: 'osmosis',
            base_denom:
              'ibc/2FFE07C4B4EFC0DDA099A16C6AF3C9CCA653CC56077E87217A585D48794B0BC7',
          },
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/chihuahua/images/baddog.png',
          theme: {
            primary_color_hex: '#F7E3C0',
            background_color_hex: '#F7E3C0',
            circle: true,
          },
        },
        {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/chihuahua/images/baddog.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/chihuahua/images/baddog.svg',
          theme: {
            primary_color_hex: '#eedebe',
          },
        },
      ],
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/chihuahua/images/baddog.png',
      },
    },
  ],
};
harden(assets);
