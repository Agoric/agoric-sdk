import { makeHelpers } from '@agoric/deploy-script-support';
import { strictPriceFeedProposalBuilder } from '../vats/priceFeedSupport.js';

const configurations = {
  UNRELEASED_A3P_INTEGRATION: {
    oracleAddresses: [
      'agoric1lu9hh5vgx05hmlpfu47hukershgdxctk6l5s05', // GOV1
      'agoric15lpnq2mjsdhtztf6khp7mrsq66hyrssspy92pd', // GOV2
      'agoric1mwm224epc4l3pjcz7qsxnudcuktpynwkmnfqfp', // GOV3
    ],
    inBrandNames: ['ATOM', 'stATOM'],
  },
  UNRELEASED_main: {
    oracleAddresses: [
      'agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78', // DSRV
      'agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p', // Stakin
      'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8', // 01node
      'agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr', // Simply Staking
      'agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj', // P2P
    ],
    inBrandName: ['ATOM', 'stATOM', 'stOSMO', 'stTIA', 'stkATOM'],
  },
  UNRELEASED_devnet: {
    oracleAddresses: [
      'agoric1lw4e4aas9q84tq0q92j85rwjjjapf8dmnllnft', // DSRV
      'agoric1zj6vrrrjq4gsyr9lw7dplv4vyejg3p8j2urm82', // Stakin
      'agoric1ra0g6crtsy6r3qnpu7ruvm7qd4wjnznyzg5nu4', // 01node
      'agoric1qj07c7vfk3knqdral0sej7fa6eavkdn8vd8etf', // Simply Staking
      'agoric10vjkvkmpp9e356xeh6qqlhrny2htyzp8hf88fk', // P2P
    ],
    inBrandNames: ['ATOM', 'stTIA', 'stkATOM'],
  },
};

export default async (homeP, endowments) => {
  const upgradeEnvironment = endowments.scriptArgs?.[0];
  console.log('UPPrices', upgradeEnvironment);

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  const coreEvalSteps = [];
  for (const config of configurations[upgradeEnvironment]) {
    const { inBrandNames, oracleAddresses } = config;
    for (const inBrandName of inBrandNames) {
      const options = {
        AGORIC_INSTANCE_NAME: `${inBrandName}-USD price feed`,
        ORACLE_ADDRESSES: oracleAddresses,
        IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', inBrandName],
      };
      coreEvalSteps.push(
        writeCoreEval(options.AGORIC_INSTANCE_NAME, opts =>
          strictPriceFeedProposalBuilder({ ...opts, ...options }),
        ),
      );
    }
  }

  // TODO(hibbert) leave a marker in promise space as a signal to vaults upgrade

  await Promise.all(coreEvalSteps);
};
