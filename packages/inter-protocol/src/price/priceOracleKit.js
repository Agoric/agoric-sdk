import { defineDurableExoClass, M, makeKindHandle } from '@agoric/vat-data';

export const INVITATION_MAKERS_DESC = 'oracle invitation';

/**
 * @typedef {{
 *   oracleId: string,
 *   roundPowers: { handlePush: (status: OracleStatus, result: import('./roundsManager.js').PriceRound) => Promise<OracleStatus> }
 * }} HeldParams
 */

/**
 * @typedef {{ roundId: number | undefined, unitPrice: NatValue }} PriceDatum
 */

/**
 * @typedef {object} OracleStatus
 * @property {bigint} lastReportedRound
 * @property {bigint} lastStartedRound
 * @property {bigint} latestSubmission
 * @property {string} oracleId
 */
/**
 * @typedef {Readonly<HeldParams & {
 * }>} ImmutableState
 *
 * @typedef {OracleStatus & {
 * }} MutableState
 */
/** @typedef {ImmutableState & MutableState} State */

const oracleAdminKind = makeKindHandle('OracleAdmin');

/**
 * @param {HeldParams} heldParams
 * @returns {State}
 */
const initState = ({ oracleId, roundPowers }) => {
  return {
    oracleId,
    roundPowers,
    lastReportedRound: 0n,
    lastStartedRound: 0n,
    latestSubmission: 0n,
  };
};

const OracleAdminI = M.interface('OracleAdmin', {
  pushPrice: M.call({ roundId: M.any(), unitPrice: M.bigint() }).returns(
    M.promise(),
  ),
  getStatus: M.call().returns(M.record()),
});

export const makeOracleAdmin = defineDurableExoClass(
  oracleAdminKind,
  OracleAdminI,
  initState,
  {
    /**
     * push a unitPrice result from this oracle
     *
     * @param {PriceDatum} datum
     */
    async pushPrice({ roundId: roundIdRaw = undefined, unitPrice: valueRaw }) {
      const { state } = this;
      const { roundPowers } = state;
      const result = await roundPowers.handlePush(
        {
          oracleId: state.oracleId,
          lastReportedRound: state.lastReportedRound,
          lastStartedRound: state.lastStartedRound,
          latestSubmission: state.latestSubmission,
        },
        {
          roundId: roundIdRaw,
          unitPrice: valueRaw,
        },
      );

      state.lastReportedRound = result.lastReportedRound;
      state.lastStartedRound = result.lastStartedRound;
      state.latestSubmission = result.latestSubmission;
    },
    /**
     *
     * @returns {OracleStatus}
     */
    getStatus() {
      const { state } = this;
      return {
        oracleId: state.oracleId,
        lastReportedRound: state.lastReportedRound,
        lastStartedRound: state.lastStartedRound,
        latestSubmission: state.latestSubmission,
      };
    },
  },
);

/** @typedef {ReturnType<typeof makeOracleAdmin>} OracleAdmin */
