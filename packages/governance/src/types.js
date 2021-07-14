// @ts-check

/**
 * @typedef { 'amount' | 'brand' | 'installation' | 'instance' | 'nat' | 'ratio' | 'string' | 'unknown' } ParamType
 */

/**
 * @typedef { Amount | Brand | Installation | Instance | bigint | Ratio | string | unknown } ParamValue
 */

/**
 * @typedef { 'choose_n' | 'order' | 'weight' } ChoiceMethod
 *  CHOOSE_N: voter indicates up to N they find acceptable (N might be 1).
 *  ORDER: voter lists their choices from most to least favorite.
 *  WEIGHT: voter lists their choices, each with a numerical weight. High
 *    numbers are most preferred.
 */

/**
 * @typedef { 'param_change' | 'election' | 'survey' } ElectionType
 * param_change is very specific. Survey means multiple answers are possible,
 * Election means some candidates are going to "win". It's not clear these are
 * orthogonal. The important distinction is that param_change has a structured
 * question, while the others have a question presented as a string.
 */

/**
 * @typedef { 'half' | 'all' | 'none' } QuorumRule
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
 * @property {(name: string) => ParamDescription} getParam
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
 * @property {QuorumRule} quorumRule
 */

/**
 * @typedef {Object} SimpleQuestion
 * @property {string} question
 */

/**
 * @typedef {Object} ParamChangeQuestion
 * @property {string} param
 * @property {Instance} contract
 * @property {ParamValue} proposedValue
 */

/**
 * @typedef { SimpleQuestion | ParamChangeQuestion } Question
 */

/**
 * @typedef {Object} QuestionTerms - BallotSpec plus the Registrar Instance
 * @property {Question} question
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
 * @property {Question} question
 * @property {string[]} positions
 * @property {ElectionType} electionType
 * @property {number} maxChoices
 */

/**
 * @typedef {Object} BallotDetails
 *    ballot details: BallotSpec details of a particular vote
 * @property {BallotSpec} ballotSpec
 * @property {Instance} instance - instance of the BallotCounter
 * @property {ClosingRule} closingRule
 * @property {Handle<'Ballot'>} handle
 */

/**
 * @typedef {Object} BinaryBallotDetails
 *    ballot details for a binary ballot include quorum and default winner
 * @property {BallotSpec} ballotSpec
 * @property {ClosingRule} closingRule
 * @property {QuorumRule} quorumRule
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
 * @property {() => BallotDetails} getDetails
 * @property {() => Promise<VoteStatistics>} getStats
 */

/**
 * @typedef {Object} BallotCounterCloseFacet
 *   TEST ONLY: Should not be allowed to escape from contracts
 * @property {() => void} closeVoting
 */

/**
 * @typedef {Object} CompleteEqualWeightBallot
 * @property {Question} question
 * @property {Handle<'Ballot'>} handle
 * @property {string[]} chosen - a list of equal-weight preferred positions
 */

/**
 * @typedef {Object} CompleteWeightedBallot
 * @property {Question} question
 * @property {Handle<'Ballot'>} handle
 * @property {Record<string,bigint>[]} weighted - list of positions with weights.
 *   BallotCounter may limit weights to a range or require uniqueness.
 */

/**
 * @typedef {Object} BallotCounterFacets
 * @property {BallotCounterPublicFacet} publicFacet
 * @property {BallotCounterCreatorFacet} creatorFacet
 * @property {BallotCounterCloseFacet} closeFacet
 */

/**
 * @callback BuildBallotCounter
 * @param {BallotSpec} ballotSpec
 * @param {bigint} threshold
 * @param {ClosingRule} closingRule
 * @param {Instance} instance
 * @param {string=} tieOutcome
 * @returns {BallotCounterFacets}
 */

/**
 * @typedef {Object} CompleteOrderedBallot
 * @property {Question} question
 * @property {Handle<'Ballot'>} handle
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
 * @typedef QuestionCreator
 * @property {AddQuestion} addQuestion
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
 * @param {string} name
 * @returns {Governor}
 */

/**
 * @typedef {Object} GovernorPublic
 * @property {GovernContract} governContract
 * @property {() => Instance} getRegistrar
 * @property {(i: Instance) => boolean} governsContract
 */

/**
 * @callback VoteOnParamChange
 * @param {ParamManagerFull} paramMgr
 * @param {Instance} governedInstance
 * @param {QuestionCreator} questionCreator
 * @param {Instance} registrarInstance
 * @param {string} name
 * @param {ParamType} proposedValue
 * @param {Installation} ballotCounterInstallation
 * @param {Instance} contractInstance
 * @param {ClosingRule} closingRule
 */

/**
 * @typedef {Object} ParamManagerAccessor
 * @property {(a: unknown) => ParamManagerFull} get
 */

/**
 * @typedef {Object} ParamGovernor
 * @property {VoteOnParamChange} voteOnParamChange
 */

/**
 * @typedef {Object} RegistrarPublic
 * @property {() => Notifier<BallotDetails>} getQuestionNotifier
 * @property {() => ERef<Handle<'Ballot'>[]>} getOpenQuestions,
 * @property {() => string} getName
 * @property {() => Instance} getInstance
 * @property {(h: Handle<'Ballot'>) => ERef<Ballot>} getBallot
 */

/**
 * @typedef {Object} RegistrarCreator
 * @property {AddQuestion} addQuestion
 * @property {() => Invitation[]} getVoterInvitations
 * @property {() => Notifier<BallotDetails>} getQuestionNotifier
 * @property {() => RegistrarPublic} getPublicFacet
 */

/**
 * @callback SetupGovernance
 * @param {ERef<ParamManagerAccessor>} accessor
 * @param {RegistrarCreator} registrarCreator
 * @param {Instance} contractInstance
 * @returns {ParamGovernor}
 */
