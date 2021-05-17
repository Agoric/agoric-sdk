/**
 * @typedef {Handle<'ValidatorHandle'>} ValidatorHandle
 *
 * @typedef {Handle<'DelegatorHandle'>} DelegatorHandle
 *
 * TODO(hibbert)
 * @typedef {Record<>} RewardRecord
 */

/**
 * @typedef { 'unbonded' | 'bonded' | 'unbonding' } BondingStatus
 */

/**
 * @typedef {Object} Delegation
 * @property {() => Delegator} getDelegator
 * @property {() => number} getStake
 * @property {() => Validator} getValidator
 * @property {(slashFactor: number) => void} slashed - reduce the current stake
 *   of the Delegator, by following the chain of progeny to the current
 *   Delegations.
 * @property {() => Array<Delegation>} unbond - produce one or two Delegations.
 * If the entire stake was unbonded only one Delegation is returned
 * @property {(soFar: number, id) => number} accumulatedStake - a function
 *   passed to reduce() to calculate stake over a number of Delegations.
 * @property {(dest: Validator, delta, number, newEnd: number)
 *   => Array<Delegation>} redelegate - produce one or two Delegations to
 *   replace the receiver of the request. If the entire stake is redelegated,
 *   only one Delegation is returned.
 * @property {(block: number) => boolean} activeAt - was this Delegation active
 *   at the block number specified?
 */

/**
 * @typedef {Object} Validator
 * @property {(delegator: Delegator, stake: number) => Delegation} addDelegation
 * @property {() => ValidatorHandle} getValidatorID
 * @property {() => string} getMoniker
 * @property {() => void} setBonded
 * @property {() => void} setUnbonded
 * @property {(end: number) => void} startUnbonding
 * @property {() => boolean} isBonded
 * @property {() => boolean} isUnbonded
 * @property {() => RewardRecord} rewardRecord
 * @property {() => number} totalStaked
 * @property {(replacement: Delegation, original: Delegation, delta: number) => void} unbond
 * @property {(redelegation: Delegation, original: Delegation, replacement: Delegation) => void} redelegateReduce
 * @property {(redelegation: Delegation) => void} redelegate
 * @property {(start: number, duration: number) => void} penalize
 * @property {(timestamp: number) => number} ready
 * @property {(finder: any) => number} dispatchSettledRewards
 * @property {(slashFactor: number) => void} slash
 * @property {(old: Delegation, next: Delegation) => void} slashDelegation
 */

/**
 * @typedef {Object} Delegator
 * @property {(delegation: Delegation) => void} addDelegation
 * @property {(delegation: Delegation, delta: number, end: number) => Array<Delegation>} unbond
 * @property {(delegation: Delegation, destValidator: Validator, delta: number, end: number) => Array<Delegation>} redelegate
 * @property {(finder: any) => number} dispatchSettledRewards
 * @property {() => DelegatorHandle} getDelegatorId
 * @property {(slashValue: number, old: Delegation, next: Delegation) => void} slashed
 * @property {() => number} getStake
 */

/**
 * @typedef {Object} ToCosmos
 * @property {(validator: ValidatorHandle, reward: number) => void} proposerReward
 * @property {(amount: number, validator: ValidatorHandle) => void} commission
 * @property {(amount: number, validator: ValidatorHandle) => void} rewards
 */

/**
 * @typedef {Object} FromCosmos
 * @property {() => void} endBlock,
 * @property {() => void} createValidator,
 * @property {() => void} editValidator,
 * @property {() => void} delegate,
 * @property {() => void} undelegate,
 * @property {() => void} redelegate,
 * @property {() => void} validatorBonded,
 * @property {() => void} slash,
 * @property {() => void} validatorUnbonding,
 * @property {() => void} validatorDeleted,
 */
