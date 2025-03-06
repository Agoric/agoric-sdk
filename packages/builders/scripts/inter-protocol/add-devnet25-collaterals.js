import { makeHelpers } from '@agoric/deploy-script-support';
import { defaultProposalBuilder as vaultProposalBuilder } from './add-collateral-core.js';
import { defaultProposalBuilder as oraclesProposalBuilder } from './price-feed-core.js';

const config = {
  decimalPlaces: 6,
  // verify at https://devnet.explorer.agoric.net/agoric/account/agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce
  denomByName: {
    dATOM: `ibc/49C630713B2AB60653F76C0C58D43C2A64956803B4D422CACB6DD4AD016ED846`,
    stOSMO: `ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596`,
    stTIA: `ibc/42225F147137DDEB5FEF0F1D0A92F2AD57557AFA2C4D6F30B21E0D983001C002`,
    stATOM: `ibc/B60D2EF81DE7CCAE53C59B7850667595A7D580200C5636C8922ED78C95532BA7`,
  },
  // from packages/vm-config/decentral-devnet-config.json
  oracleAddresses: [
    'agoric10vjkvkmpp9e356xeh6qqlhrny2htyzp8hf88fk',
    'agoric1qj07c7vfk3knqdral0sej7fa6eavkdn8vd8etf',
    'agoric1lw4e4aas9q84tq0q92j85rwjjjapf8dmnllnft',
    'agoric1ra0g6crtsy6r3qnpu7ruvm7qd4wjnznyzg5nu4',
    'agoric1zj6vrrrjq4gsyr9lw7dplv4vyejg3p8j2urm82',
  ],
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
const starsOraclesProposalBuilder = async powers => {
  return oraclesProposalBuilder(powers, {
    AGORIC_INSTANCE_NAME: `STARS-USD price feed`,
    IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'STARS'],
    IN_BRAND_DECIMALS: 6,
    OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
    OUT_BRAND_DECIMALS: 4,
    oracleAddresses: [
      // copied from decentral-main-vaults-config.json
      'agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr',
      'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8',
      'agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78',
      'agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p',
      'agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj',
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  const { decimalPlaces, oracleAddresses, denomByName } = config;

  for (const [name, denom] of Object.entries(denomByName)) {
    await writeCoreEval(`add-${name}`, powers =>
      vaultProposalBuilder(powers, {
        interchainAssetOptions: {
          denom,
          decimalPlaces,
          keyword: name,
          oracleBrand: name,
          proposedName: name,
        },
      }),
    );
    await writeCoreEval(`add-${name}-oracles`, powers =>
      oraclesProposalBuilder(powers, {
        AGORIC_INSTANCE_NAME: `${name}-USD price feed`,
        IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', name],
        IN_BRAND_DECIMALS: 6,
        OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
        OUT_BRAND_DECIMALS: 4,
        oracleAddresses,
      }),
    );
  }
};
