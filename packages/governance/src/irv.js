import { Fail } from '@agoric/assert';
import { keyEQ } from '@agoric/store';

/**
 * @typedef {object} RecordedBallot
 * @property {Position[]} chosen
 * @property {bigint} shares
 */

/**
 * @typedef {object} PositionStats
 * @property {Position} position
 * @property {string} positionKey
 * @property {bigint} total
 * @property {bigint[]} details
 * @property {BallotWithKey[]} votes
 */

/**
 * @typedef {object} PositionWithKey
 * @property {string} key
 * @property {Position} inner
 */

/**
 * @typedef {object} BallotWithKey
 * @property {PositionWithKey[]} chosen
 * @property {bigint} shares
 */

/**
 * @typedef {object} RoundPositionStats
 * @property {bigint} count
 * @property {BallotWithKey[]} votes
 */

/**
 * @typedef {Record<string, PositionStats>} VoteStatsRecord
 * @typedef {Record<string, RoundPositionStats>} RoundStatsRecord
 */

/**
 * Compare 2 positions stats, randomly shuffle on equal to support tie-breaking
 *
 * @param {PositionStats} a
 * @param {PositionStats} b
 *
 * @returns {number}
 */
const comparePositionStats = (a, b) =>
  // compare total first
  Number(b.total - a.total) ||
  // then check details
  b.details.join('.').localeCompare(a.details.join('.')) ||
  // then randomly shuffle
  (Math.random() > 0.5 ? 1 : -1);

/**
 * @param {VoteStatsRecord} stats
 * @param {BallotWithKey[]} ballots
 * @param {Array<string>} availableKeys
 */
const updateVoteStats = (stats, ballots, availableKeys) => {
  /** @type RoundStatsRecord */
  const roundStats = {};

  availableKeys.forEach(key => {
    roundStats[key] = {
      count: 0n,
      votes: stats[key].votes,
    };
  });

  const availableKeySet = new Set(availableKeys);

  // update roundStats by ballots
  ballots.forEach(b => {
    const chosen = b.chosen.filter(c => availableKeySet.has(c.key));
    const positionKey = chosen[0]?.key;
    const pRoundStats = positionKey && roundStats[positionKey];

    if (pRoundStats) {
      pRoundStats.count += b.shares;

      if (chosen.length > 1) {
        pRoundStats.votes.push({
          chosen: chosen.slice(1),
          shares: b.shares,
        });
      }
    }
  });

  availableKeys.forEach(key => {
    const pStats = stats[key];
    const { count, votes } = roundStats[key];

    pStats.total += count;
    pStats.details.push(count);
    pStats.votes = votes;
  });
};

/**
 * @param {VoteStatsRecord} stats
 * @param {bigint} winningThreshold
 * @param {Array<string>} availableKeys
 *
 * @returns {{
 *  winner?: PositionStats,
 *  eliminated?: PositionStats[],
 * }}
 */
const validateResult = (stats, winningThreshold, availableKeys) => {
  const sorted = availableKeys
    .map(key => stats[key])
    .sort(comparePositionStats);

  const first = sorted[0];
  const count = sorted.length;

  if (count === 1 || (winningThreshold && first.total > winningThreshold)) {
    return {
      winner: first,
    };
  }

  const last = sorted[count - 1];
  const eliminated = sorted.filter(e => e.total === last.total);

  const remaining = count - eliminated.length;
  const isFullTie = last.total === first.total;

  if (isFullTie || remaining === 1) {
    // all positions have a same vote total, or remaining 1 after the elimination
    // then we select the best and finish the round
    return {
      winner: first,
    };
  }

  // not a full tie, nor any winner elected
  // we elminate the all the least performant positions
  return {
    eliminated,
  };
};

/**
 * @param {RecordedBallot[]} allBallots
 * @param {Position[]} allPositions
 * @param {bigint} winningThreshold
 *
 * @returns {{
 *  winner?: Position
 *  stats: VoteStatsRecord
 * }}
 */
const countIRVVotes = (allBallots, allPositions, winningThreshold = 0n) => {
  /** @type VoteStatsRecord */
  const stats = {};

  if (allBallots.length < 1) {
    return {
      stats,
    };
  }

  /** @type PositionWithKey[] */
  const positions = allPositions.map((p, idx) =>
    harden({
      key: `position-${idx}`,
      inner: p,
    }),
  );

  /** @type BallotWithKey[] */
  let ballots = allBallots.map(b => ({
    chosen: b.chosen.map(
      choice =>
        positions.find(ap => keyEQ(ap.inner, choice)) ||
        Fail`Invalid choice found ${choice}`,
    ),
    shares: b.shares,
  }));

  // init stats
  positions.forEach(p => {
    stats[p.key] = {
      position: p.inner,
      positionKey: p.key,
      total: 0n,
      details: [],
      votes: [],
    };
  });

  let availableKeys = positions.map(p => p.key);

  while (availableKeys.length > 0) {
    updateVoteStats(stats, ballots, availableKeys);
    const { winner, eliminated } = validateResult(
      stats,
      winningThreshold,
      availableKeys,
    );

    if (winner) {
      return {
        winner: winner.position,
        stats,
      };
    }

    assert(eliminated && eliminated.length, `No winner nor eliminated found`);

    ballots = [];
    eliminated.forEach(p => {
      // update position keys
      availableKeys = availableKeys.filter(key => key !== p.positionKey);

      // update redistributed ballots
      ballots = ballots.concat(p.votes);
    });
  }

  return {
    stats,
  };
};

export { countIRVVotes };
