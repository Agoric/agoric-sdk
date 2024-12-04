import type { IBCChannelID } from '@agoric/vats';

export const oracleMnemonics = {
  oracle1:
    'cause eight cattle slot course mail more aware vapor slab hobby match',
  oracle2:
    'flower salute inspire label latin cattle believe sausage match total bless refuse',
  oracle3:
    'surge magnet typical drive cement artist stay latin chief obey word always',
};
harden(oracleMnemonics);

export const makeFeedPolicy = (nobleAgoricChannelId: IBCChannelID) => {
  return JSON.stringify({
    nobleAgoricChannelId,
    nobleDomainId: 4,
    chainPolicies: {
      Arbitrum: {
        cctpTokenMessengerAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
        chainId: 42161,
        confirmations: 2,
        nobleContractAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
      },
    },
  });
};
harden(makeFeedPolicy);
