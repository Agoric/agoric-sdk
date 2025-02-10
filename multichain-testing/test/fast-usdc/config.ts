import type { IBCChannelID } from '@agoric/vats';
import type { FeedPolicy } from '@agoric/fast-usdc';

export const oracleMnemonics = {
  oracle1:
    'cause eight cattle slot course mail more aware vapor slab hobby match',
  oracle2:
    'flower salute inspire label latin cattle believe sausage match total bless refuse',
  oracle3:
    'surge magnet typical drive cement artist stay latin chief obey word always',
};
harden(oracleMnemonics);

export const makeFeedPolicyPartial = (
  nobleAgoricChannelId: IBCChannelID,
): Omit<FeedPolicy, 'chainPolicies'> => {
  // XXX consider using toExternalConfig to marshal bigints and send ChainPolicies
  return {
    nobleAgoricChannelId,
    nobleDomainId: 4,
  };
};
harden(makeFeedPolicyPartial);
