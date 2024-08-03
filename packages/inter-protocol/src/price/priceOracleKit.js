import { Fail } from '@endo/errors';
import { makeTracer } from '@agoric/internal';
import { M, prepareExoClassKit } from '@agoric/vat-data';

const trace = makeTracer('OrKit', true);

export const INVITATION_MAKERS_DESC = 'oracle invitation';

/**
 * @typedef {{
 *   oracleId: string;
 *   roundPowers: {
 *     handlePush: (
 *       status: OracleStatus,
 *       result: import('./roundsManager.js').PriceRound,
 *     ) => Promise<OracleStatus>;
 *   };
 * }} HeldParams
 */

/** @typedef {{ roundId: number | undefined; unitPrice: NatValue }} PriceDatum */

/**
 * @typedef {object} OracleStatus
 * @property {boolean} [disabled]
 * @property {bigint} lastReportedRound
 * @property {bigint} lastStartedRound
 * @property {bigint} latestSubmission
 * @property {string} oracleId
 */
/**
 * @typedef {Readonly<HeldParams & {}>} ImmutableState
 *
 * @typedef {OracleStatus & {}} MutableState
 */
/** @typedef {ImmutableState & MutableState} State */

/**
 * @param {HeldParams} heldParams
 * @returns {State}
 */
const initState = ({ oracleId, roundPowers }) => {
  return {
    oracleId,
    roundPowers,
    disabled: false,
    lastReportedRound: 0n,
    lastStartedRound: 0n,
    latestSubmission: 0n,
  };
};

const AdminI = M.interface('OracleKitAdmin', {
  disable: M.call().returns(),
});

const OracleI = M.interface('Oracle', {
  pushPrice: M.call(
    M.splitRecord(
      { unitPrice: M.bigint() },
      { roundId: M.or(M.bigint(), M.number()) },
    ),
  ).returns(M.promise()),
  getStatus: M.call().returns(M.record()),
});

export const prepareOracleAdminKit = baggage =>
  prepareExoClassKit(
    baggage,
    'OracleKit',
    { admin: AdminI, oracle: OracleI },
    initState,
    {
      admin: {
        disable() {
          trace(`oracle ${this.state.oracleId} disabled`);
          this.state.disabled = true;
        },
      },
      oracle: {
        /**
         * push a unitPrice result from this oracle
         *
         * @param {PriceDatum} datum
         */
        async pushPrice({
          roundId: roundIdRaw = undefined,
          unitPrice: valueRaw,
        }) {
          const { state } = this;
          !state.disabled || Fail`pushPrice for disabled oracle`;
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
        /** @returns {OracleStatus} */
        getStatus() {
          const { state } = this;
          return {
            oracleId: state.oracleId,
            disabled: state.disabled,
            lastReportedRound: state.lastReportedRound,
            lastStartedRound: state.lastStartedRound,
            latestSubmission: state.latestSubmission,
          };
        },
      },
    },
  );

/** @typedef {ReturnType<ReturnType<typeof prepareOracleAdminKit>>} OracleKit */
