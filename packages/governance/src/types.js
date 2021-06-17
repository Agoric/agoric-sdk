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
 * @callback GetParams
 * @returns {Record<Keyword,ParamDescription>}
 */

/**
 * @typedef {Object} ParamManagerBase
 * @property {GetParams} getParams
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
 * @typedef {Object} QuestionTermsShort - ballot details for the Registrar
 * @property {BallotSpec} ballotSpec
 * @property {ClosingRule} closingRule
 */

/**
 * @typedef {Object} QuestionTerms - BallotSpec plus the Registrar Instance
 * @property {string} question
 * @property {string[]} positions
 * @property {ChoiceMethod} method
 * @property {number} maxChoices
 * @property {ClosingRule} closingRule
 * @property {Instance} registrar
 */

/**
 * @typedef {Object} BallotSpec
 *    ballot specification: only questions and choices
 * @property {ChoiceMethod} method
 * @property {string} question
 * @property {string[]} positions
 * @property {number} maxChoices
 */

/**
 * @typedef {Object} BallotDetails
 *    ballot details: BallotSpec details of a particular vote
 * @property {BallotSpec} ballotSpec
 * @property {Instance} instance
 * @property {ClosingRule} closingRule
 */

/**
 * @typedef {Object} BinaryBallotDetails
 *    ballot details for a binary balllot include quorum and default winner
 * @property {BallotSpec} ballotSpec
 * @property {ClosingRule} closingRule
 * @property {bigint} quorumThreshold
 * @property {string} tieOutcome
 */

/**
 * @typedef {Object} Ballot
 * @property {() => Instance} getBallotCounter
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
 * @param {BallotSpec} ballotSpec
 * @param {Instance} instance - ballotCounter instance
 * @param {ClosingRule} closingRule
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
 * @property {Timestamp} deadline
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

/**
 * @callback CreateQuestion
 *
 * @param {string} name - The name of the parameter to change
 * @param {ParamValue} proposedValue - the proposed value for the named
 *   parameter
 * @param {Installation} ballotCounterInstallation - the ballotCounter to
 *   instantiate to count votes. Expected to be a binaryBallotCounter. Other
 *   ballotCounters might be added here, or might require separate governors.
 *   under management so users can trace it back and see that it would use
 *   this electionManager to manage parameters
 * @param {Instance} contractInstance - include the instance of the contract
 * @param {ClosingRule} closingRule - deadline and timer for closing voting
 * @returns {Promise<BallotDetails>}
 */

/**
 * @typedef {Object} Governor
 * @property {CreateQuestion} createQuestion
 */

/**
 * @callback GovernContract
 *
 * @param {Instance} governedInstance
 * @param {ParamManagerFull} mgr - a ParamManager
 * @param {ParamDescriptions} paramSet
 * @returns {Governor}
 */
