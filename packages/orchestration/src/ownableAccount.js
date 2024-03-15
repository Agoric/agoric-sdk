// @ts-check
import { AmountShape } from '@agoric/ertp';
import { prepareOwnable } from '@agoric/zoe/src/contractSupport/prepare-ownable.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

/**
 *
 * @param {import('@agoric/zone').Zone} zone
 * @param {ZCF} zcf
 */
export const prepareOwnableAccountKit = (zone, zcf) => {
  const makeUnderlyingKit = zone.exoClassKit(
    'OwnableAccount',
    {
      invitationMakers: M.interface('OwnableAccount invitationMakers', {
        Delegate: M.call(M.string(), AmountShape).returns(M.promise()),
      }),
      viewer: M.interface('ViewAccount', {
        view: M.call().returns(M.bigint()),
      }),
    },
    /**
     * @param {import('@agoric/vats/src/localchain.js').LocalChainAccount} account
     */
    account => ({
      account,
    }),
    {
      invitationMakers: {
        /**
         * @param {string} validatorAddress
         * @param {Amount} amount
         */
        async Delegate(validatorAddress, amount) {
          console.log('OwnableAccount Delegate', validatorAddress, amount);
          const { account } = this.state;
          return zcf.makeInvitation(async () => {
            const delegatorAddress = await E(account).getAddress();
            const result = E(account).executeTx([
              {
                '@type': '/cosmos.staking.v1beta1.MsgDelegate',
                obj: {
                  amount: 'FIXME',
                  validatorAddress,
                  delegatorAddress,
                },
              },
            ]);
            console.log('OwnableAccount Delegate result', result);
            return result;
          }, 'Delegate assets of chain account');
        },
      },
      viewer: {
        view() {
          return 'DUMMY';
        },
      },
    },
  );

  const makeOwnable = prepareOwnable(
    zone,
    (...args) => zcf.makeInvitation(...args),
    'OwnableCounter',
    /** @type {const} */ (['invitationMakers', 'getInvitationCustomDetails']),
  );

  /**
   * @param {import('@agoric/vats/src/localchain.js').LocalChainAccount} account
   */
  const makeOwnableAccountKit = account => {
    const underlying = makeUnderlyingKit(account);
    const ownable = makeOwnable(underlying.invitationMakers);
    return ownable;
  };
  return makeOwnableAccountKit;
};
harden(prepareOwnableAccountKit);
/** @typedef {ReturnType<Awaited<ReturnType<typeof prepareOwnableAccountKit>>>} OwnableAccountKit */
