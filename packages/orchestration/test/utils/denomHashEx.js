import { denomHash } from '../../src/utils/denomHash.js';

export const denomHashExample = () => {
  const h = denomHash({ channelId: 'channel-0', denom: 'uatom' });
  return h;
};
