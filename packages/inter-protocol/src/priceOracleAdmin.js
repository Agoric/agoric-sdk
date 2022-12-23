import { defineDurableFarClass, M, makeKindHandle } from '@agoric/vat-data';

export const INVITATION_MAKERS_DESC = 'oracle invitation';

/**
 * @typedef {{
 *   roundPowers: { handlePush: Function }
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
const initState = ({ roundPowers }) => {
  return {
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

export const makeOracleAdmin = defineDurableFarClass(
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

      const { handlePush } = state.roundPowers;

      const result = await handlePush(
        {
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
        lastReportedRound: state.lastReportedRound,
        lastStartedRound: state.lastStartedRound,
        latestSubmission: state.latestSubmission,
      };
    },
  },
);

/** @typedef {ReturnType<typeof makeOracleAdmin>} OracleAdmin */
