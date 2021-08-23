// @ts-check

/**
 * @typedef { 'amount' | 'brand' | 'installation' | 'instance' | 'nat' | 'ratio' | 'string' | 'unknown' } ParamType
 */

/**
 * @typedef { Amount | Brand | Installation | Instance | bigint | Ratio | string | unknown } ParamValue
 */

/**
 * @typedef { 'choose_n' | 'order' | 'weight' } ChoiceMethod
 */

/**
 * @typedef {Object} ParamDescription
 * @property {string} name
 * @property {ParamValue} value
 * @property {ParamType} type
 */

/**
 * @typedef {Object} ParamManagerBase
 * @property {() => Record<Keyword,ParamDescription>} getParams
 *
 * @typedef {{ [updater: string]: (arg: ParamValue) => void }} ParamManagerUpdaters
 * @typedef {ParamManagerBase & ParamManagerUpdaters} ParamManagerFull
 */

/**
 * @typedef {Array<ParamDescription>} ParamDescriptions
 */

/**
 * @callback BuildParamManager
 * @param {ParamDescriptions} paramDesc
 * @returns {ParamManagerFull}
 */

/**
 * @typedef {Object} QuestionTermsShort
 *   BallotDetails as provided to the Registrar
 * @property {ChoiceMethod} method
 * @property {string} question
 * @property {string[]} positions
 * @property {number} maxChoices
 * @property {ClosingRule} closingRule
 */

/**
 * @typedef {Object} QuestionTerms
 *   BallotDetails after the Registrar adds its Instance
 * @property {ChoiceMethod} method
 * @property {string} question
 * @property {string[]} positions
 * @property {number} maxChoices
 * @property {ClosingRule} closingRule
 * @property {Instance} registrar
 */
/**
 * @typedef {Object} BallotDetails
 *   BallotDetails after the Registrar adds its Instance
 * @property {ChoiceMethod} method
 * @property {string} question
 * @property {string[]} positions
 * @property {number} maxChoices
 */

/**
 * @typedef {Object} Ballot
 * @property {(positions: string[]) => CompletedBallot} choose
 * @property {() => BallotDetails} getDetails
 */

/**
 * @typedef {Object} PositionCount
 * @property {string} position
 * @property {number} tally
 */

/**
 * @typedef {Object} VoteStatistics
 * @property {number} spoiled
 * @property {number} votes
 * @property {PositionCount[]} results
 */

/**
 * @typedef {Object} QuorumCounter
 * @property {(VoteStatistics) => boolean} check
 */

/**
 * @callback BuildBallot
 * @param {ChoiceMethod} method
 * @param {string} question
 * @param {string[]} positions
 * @param {number} maxChoices
 * @param {Instance} instance - ballotCounter instance
 * @returns {Ballot}
 */

/**
 * @typedef {Object} BallotCounterCreatorFacet
 * @property {() => boolean} isOpen
 * @property {() => Ballot} getBallotTemplate
 * @property {() => VoterFacet} getVoterFacet
 */

/**
 * @typedef {Object} BallotCounterPublicFacet
 * @property {() => boolean} isOpen
 * @property {() => Ballot} getBallotTemplate
 * @property {() => Promise<string>} getOutcome
 * @property {() => Promise<VoteStatistics>} getStats
 */

/**
 * @typedef {Object} BallotCounterCloseFacet
 *   TEST ONLY: Should not be allowed to escape from contracts
 * @property {() => void} closeVoting
 */

/**
 * @typedef {Object} CompleteEqualWeightBallot
 * @property {string} question
 * @property {string[]} chosen - a list of equal-weight preferred positions
 */

/**
 * @typedef {Object} CompleteWeightedBallot
 * @property {string} question
 * @property {Record<string,bigint>[]} weighted - list of positions with weights.
 *   BallotCounter may limit weights to a range or require uniqueness.
 */

/**
 * @typedef {Object} CompleteOrderedBallot
 * @property {string} question
 * @property {string[]} ordered - ordered list of position from most preferred to
 *   least preferred
 */

/**
 * @typedef { CompleteEqualWeightBallot | CompleteOrderedBallot | CompleteWeightedBallot } CompletedBallot
 */

/**
 * @callback SubmitVote
 * @param {Handle<'Voter'>} seat
 * @param {ERef<CompletedBallot>} filledBallot
 * @param {bigint=} weight
 */

/**
 * @typedef {Object} VoterFacet
 * @property {SubmitVote} submitVote
 */

/**
 * @typedef {Object} ClosingRule
 * @property {Timer} timer
 * @property {AbsoluteTimeish} deadline
 */

/**
 * @callback CloseVoting
 * @param {ClosingRule} closingRule
 * @param {() => void} closeVoting
 */

/**
 * @typedef {Object} AddQuestionReturn
 * @property {BallotCounterPublicFacet} publicFacet
 * @property {BallotCounterCreatorFacet} creatorFacet
 * @property {Instance} instance
 */

/**
 * @callback AddQuestion
 * @param {Installation} voteCounter
 * @param {QuestionTermsShort} questionDetailsShort
 * @returns {Promise<AddQuestionReturn>}
 */
