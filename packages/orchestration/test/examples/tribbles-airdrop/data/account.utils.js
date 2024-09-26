const generateInt = x => () => Math.floor(Math.random() * (x + 1));
const generateTierValue = generateInt(4);
const withTier = x => ({ ...x, tier: generateTierValue() });
const stringifyProp = prop => obj => ({ ...obj, [prop]: obj[prop].toString() });

const stringifyTier = stringifyProp('tier');
const formatTestAccounts = array => array.map(withTier).map(stringifyTier);
/**
 * AIRDROP_TIERS is an object that defines the distribution tiers for an airdrop event.
 * Each key represents an epoch, with the corresponding value being the number of tokens each tier will be eligible to claim at the start of an epoch. With each epoch that passes, the amount of tokens a claimaint can recieve decreases, thus incentivizing users to claim quickly.
 *
 * Properties:
 * @property {number[]} 0 - Reward amounts for tier 0, ranging from highest to lowest.
 * @property {number[]} 1 - Reward amounts for tier 1, ranging from highest to lowest.
 * @property {number[]} 2 - Reward amounts for tier 2, ranging from highest to lowest.
 * @property {number[]} 3 - Reward amounts for tier 3, ranging from highest to lowest.
 * @property {number[]} 4 - Reward amounts for tier 4, ranging from highest to lowest.
 * @property {number[]} 5 - Reward amounts for tier 5, ranging from highest to lowest.
 */
const AIRDROP_TIERS = {
  0: [1000, 800, 650, 500, 350],
  1: [600, 480, 384, 307, 245],
  2: [480, 384, 307, 200, 165],
  3: [300, 240, 192, 153, 122],
  4: [100, 80, 64, 51, 40],
  5: [15, 13, 11, 9, 7],
};

const AIRDROP_TIERS_STATIC = [9000n, 6500n, 3500n, 1500n, 750n];

export {
  AIRDROP_TIERS,
  AIRDROP_TIERS_STATIC,
  formatTestAccounts,
  generateInt,
  generateTierValue,
  stringifyTier,
  withTier,
};
