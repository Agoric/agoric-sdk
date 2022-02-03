// @ts-check

/**
 * @typedef { 'unranked' | 'order' } ChoiceMethod
 * * UNRANKED: "unranked voting" means that the voter specifies some number of
 *    positions, and is endorsing them equally.
 * * ORDER: The voter assigns ordinal numbers to some of the positions. The
 *    positions will be treated as an ordered list with no gaps.
 *
 * When voters are limited to choosing a single candidate, either UNRANKED or
 * ORDER would work. UNRANKED has a simpler representation so we use that.
 */

/**
 * @typedef { 'param_change' | 'election' | 'survey' } ElectionType
 * param_change is very specific. Survey means multiple answers are possible,
 * Election means some candidates are going to "win". It's not clear these are
 * orthogonal. The important distinction is that param_change has a structured
 * issue, while the others have a issue presented as a string.
 */

/**
 * @typedef { 'amount' | 'brand' | 'instance' | 'installation' | 'invitation' |
 *   'nat' | 'ratio' | 'string' | 'unknown' } ParamType
 */

/**
 * @typedef { 'majority' | 'all' | 'no_quorum' } QuorumRule
 */

/**
 * @typedef {Object} SimpleIssue
 * @property {string} text
 */

/**
 * @typedef { Amount | Brand | Installation | Instance | bigint |
 *   Ratio | string | unknown } ParamValue
 */

/**
 * @template T
 * @typedef {{ type: T }} ParamRecord<T>
 */

/**
 * @typedef {ParamRecord<'amount'> & { value: Amount } |
 *   ParamRecord<'brand'> & { value: Brand } |
 *   ParamRecord<'installation'> & { value: Installation } |
 *   ParamRecord<'instance'> & { value: Instance } |
 *   ParamRecord<'invitation'> & { value: Amount } |
 *   ParamRecord<'nat'> & { value: bigint } |
 *   ParamRecord<'ratio'> & { value: Ratio } |
 *   ParamRecord<'relativeTime'> & { value: RelativeTime } |
 *   ParamRecord<'string'> & { value: string } |
 *   ParamRecord<'unknown'> & { value: unknown }
 * } ParamDescription
 */

/**
 * @template T
 * @typedef {{ type: T }} ParamShortRecord
 */

/**
 * @typedef {ParamShortRecord<'amount'> & { value: Amount } |
 *   ParamShortRecord<'brand'> & { value: Brand } |
 *   ParamShortRecord<'installation'> & { value: Installation } |
 *   ParamShortRecord<'instance'> & { value: Instance } |
 *   ParamShortRecord<'invitation'> & { value: Amount } |
 *   ParamShortRecord<'nat'> & { value: bigint } |
 *   ParamShortRecord<'ratio'> & { value: Ratio } |
 *   ParamShortRecord<'string'> & { value: string } |
 *   ParamShortRecord<'unknown'> & { value: unknown }
 * } ParamShortDescription
 */

/**
 * @typedef { SimpleIssue | ParamChangeIssue } Issue
 */

/**
 * @typedef {Object} QuestionTerms - QuestionSpec plus the Electorate Instance and
 *   a numerical threshold for the quorum. (The voteCounter doesn't know the
 *   size of the electorate, so the Electorate has to say what limit to enforce.)
 * @property {QuestionSpec} questionSpec
 * @property {number} quorumThreshold
 * @property {Instance} electorate
 */

/**
 * @typedef {Object} TextPosition
 * @property {string} text
 */

/**
 * @typedef { TextPosition | ChangeParamPosition |
 *   NoChangeParamPosition } Position
 */

/**
 * @typedef {Object} QuestionSpec
 *   Specification when requesting creation of a Question
 * @property {ChoiceMethod} method
 * @property {Issue} issue
 * @property {Position[]} positions
 * @property {ElectionType} electionType
 * @property {number} maxChoices
 * @property {ClosingRule} closingRule
 * @property {QuorumRule} quorumRule
 * @property {Position} tieOutcome
 */

/**
 * @typedef {Object} QuestionDetailsExtraProperties
 * @property {Instance} counterInstance - instance of the VoteCounter
 * @property {Handle<'Question'>} questionHandle
 */

/**
 * @typedef {QuestionSpec & QuestionDetailsExtraProperties} QuestionDetails
 *    complete question details: questionSpec plus counter and questionHandle
 */

/**
 * @typedef {Object} GovernancePair
 * @property {Instance} governor
 * @property {Instance} governed
 */

/**
 * @typedef {Object} Question
 * @property {() => Instance} getVoteCounter
 * @property {() => QuestionDetails} getDetails
 */

/**
 * @typedef {Object} CompleteUnrankedQuestion
 * @property {Handle<'Question'>} questionHandle
 * @property {Position[]} chosen - a list of equal-weight preferred positions
 */

// not yet in use
/**
 * @typedef {Object} CompleteWeightedBallot
 * @property {Handle<'Question'>} questionHandle
 * @property {[Position,bigint][]} weighted - list of positions with
 *   weights. VoteCounter may limit weights to a range or require uniqueness.
 */

// not yet in use
/**
 * @typedef {Object} CompleteOrderedBallot
 * @property {Handle<'Question'>} questionHandle
 * @property {Position[]} ordered - ordered list of position from most preferred
 *   to least preferred
 */

/**
 * @typedef {Object} PositionCount
 * @property {Position} position
 * @property {bigint} total
 */

/**
 * @typedef {Object} VoteStatistics
 * @property {bigint} spoiled
 * @property {number} votes
 * @property {PositionCount[]} results
 */

/**
 * @typedef {Object} QuorumCounter
 * @property {(stats: VoteStatistics) => boolean} check
 */

/**
 * @callback BuildUnrankedQuestion
 * @param {QuestionSpec} questionSpec
 * @param {Instance} instance - voteCounter instance
 * @returns {Question}
 */

/**
 * @typedef {Object} VoteCounterCreatorFacet - a facet that the Electorate should
 *   hold tightly. submitVote() is the core capability that allows the holder to
 *   specify the identity and choice of a voter. The voteCounter is making that
 *   available to the Electorate, which should wrap and attenuate it so each
 *   voter gets only the ability to cast their own vote at a weight specified by
 *   the electorate.
 * @property {SubmitVote} submitVote
 */

/**
 * @typedef {Object} VoteCounterPublicFacet
 * @property {() => boolean} isOpen
 * @property {() => Question} getQuestion
 * @property {() => Promise<Position>} getOutcome
 * @property {() => QuestionDetails} getDetails
 * @property {() => Promise<VoteStatistics>} getStats
 */

/**
 * @typedef {Object} VoteCounterCloseFacet
 *   TEST ONLY: Should not be allowed to escape from contracts
 * @property {() => void} closeVoting
 */

/**
 * @typedef {Object} VoteCounterFacets
 * @property {VoteCounterPublicFacet} publicFacet
 * @property {VoteCounterCreatorFacet} creatorFacet
 * @property {VoteCounterCloseFacet} closeFacet
 */

/**
 * @callback BuildVoteCounter
 * @param {QuestionSpec} questionSpec
 * @param {bigint} threshold - questionSpec includes quorumRule; the electorate
 *    converts that to a number that the counter can enforce.
 * @param {Instance} instance
 * @returns {VoteCounterFacets}
 */

/**
 * @callback LooksLikeQuestionSpec
 * @param {unknown} allegedQuestionSpec
 * @returns {QuestionSpec}
 */

/**
 * @callback LooksLikeParamChangeIssue
 * @param {unknown} issue
 * @returns { asserts issue is ParamChangeIssue }
 */

/**
 * @callback LooksLikeIssueForType
 * @param {ElectionType} electionType
 * @param {unknown} issue
 * @returns { asserts issue is Issue }
 */

/**
 * @callback LooksLikeSimpleIssue
 * @param {unknown} issue
 * @returns { asserts issue is SimpleIssue }
 */

/**
 * @callback LooksLikeClosingRule
 * @param {unknown} closingRule
 * @returns { asserts closingRule is ClosingRule }
 */

/**
 * @callback SubmitVote
 * @param {Handle<'Voter'>} voterHandle
 * @param {Position[]} chosenPositions
 * @param {bigint=} weight
 */

/**
 * @callback GetOpenQuestions
 * @returns {Promise<Handle<'Question'>[]>}
 */

/**
 * @callback GetQuestion
 * @param {Handle<'Question'>} h
 * @returns {Promise<Question>}
 */

/**
 * @typedef {Object} ElectoratePublic
 * @property {() => Subscription<QuestionDetails>} getQuestionSubscription
 * @property {GetOpenQuestions} getOpenQuestions,
 * @property {() => Instance} getInstance
 * @property {GetQuestion} getQuestion
 */

/**
 * @typedef { ElectoratePublic & {makeVoterInvitation: () => ERef<Invitation>} } ClaimsElectoratePublic
 * @typedef { ElectoratePublic & {getName: () => string} } CommitteeElectoratePublic
 */

/**
 * @typedef {Object} PoserFacet
 * @property {AddQuestion} addQuestion
 */

/**
 * @typedef {Object} ElectorateCreatorFacet
 *  addQuestion() can be used directly when the creator doesn't need any
 *  reassurance. When someone needs to connect addQuestion to the Electorate
 *  instance, getPoserInvitation() lets them get addQuestion with assurance.
 * @property {() => Promise<Invitation>} getPoserInvitation
 * @property {() => Subscription<QuestionDetails>} getQuestionSubscription
 * @property {() => ElectoratePublic} getPublicFacet
 */

/**
 * @typedef { ElectorateCreatorFacet & {
 *   getVoterInvitations: () => Promise<Invitation>[]
 * }} CommitteeElectorateCreatorFacet
 */

/**
 * @typedef { ElectorateCreatorFacet & {addQuestion: AddQuestion} } ShareholdersCreatorFacet
 */

/**
 * @typedef {Object} GetVoterInvitations
 * @property {() => Invitation[]} getVoterInvitations
 */

/**
 * @typedef {Object} VoterFacet - a facet that the Electorate should hold
 *   tightly. It allows specification of the vote's weight, so the Electorate
 *   should distribute an attenuated wrapper that doesn't make that available!
 * @property {SubmitVote} submitVote
 */

/**
 * @typedef {Object} ClosingRule
 * @property {ERef<Timer>} timer
 * @property {Timestamp} deadline
 */

/**
 * @callback CloseVoting
 * @param {ClosingRule} closingRule
 * @param {() => void} closeVoting
 */

/**
 * @typedef {Object} AddQuestionReturn
 * @property {VoteCounterPublicFacet} publicFacet
 * @property {VoteCounterCreatorFacet} creatorFacet
 * @property {Instance} instance
 * @property {Timestamp} deadline
 * @property {Handle<'Question'>} questionHandle
 */

/**
 * @callback AddQuestion
 * @param {ERef<Installation>} voteCounter
 * @param {QuestionSpec} questionSpec
 * @returns {Promise<AddQuestionReturn>}
 */

/**
 * @callback CreateQuestion
 *
 * @param {string} name - The name of the parameter to change
 * @param {ParamValue} proposedValue - the proposed value for the named
 *   parameter
 * @param {Installation} voteCounterInstallation - the voteCounter to
 *   instantiate to count votes. Expected to be a binaryVoteCounter. Other
 *   voteCounters might be added here, or might require separate governors.
 *   under management so users can trace it back and see that it would use
 *   this electionManager to manage parameters
 * @param {Instance} contractInstance - include the instance of the contract
 * @param {ClosingRule} closingRule - deadline and timer for closing voting
 * @returns {Promise<QuestionDetails>}
 */

/**
 * @typedef {Object} ParamChangeIssue
 * @property {ParamSpecification} paramSpec
 * @property {Instance} contract
 * @property {ParamValue} proposedValue
 */

/**
 * @typedef {Object} ParamChangePositions
 * @property {ChangeParamPosition} positive
 * @property {NoChangeParamPosition} negative
 */

/**
 * @callback MakeParamChangePositions
 *
 * Return a record containing the positive and negative positions for a
 * question on changing the param to the proposedValue.
 *
 * @param {ParamSpecification} paramSpec
 * @param {ParamValue} proposedValue
 * @returns {ParamChangePositions}
 */

/**
 * @typedef {Object} ParamChangeIssueDetails
 *    details for a question that can change a contract parameter
 * @property {ChoiceMethod} method
 * @property {ParamChangeIssue} issue
 * @property {ParamChangePositions} positions
 * @property {ElectionType} electionType
 * @property {number} maxChoices
 * @property {ClosingRule} closingRule
 * @property {QuorumRule} quorumRule
 * @property {NoChangeParamPosition} tieOutcome
 * @property {Instance} counterInstance - instance of the VoteCounter
 * @property {Handle<'Question'>} questionHandle
 */

/**
 * @callback GetGovernedVaultParams
 * @returns {{
 *  InitialMargin: ParamRecord<'ratio'> & { value: Ratio },
 *  InterestRate: ParamRecord<'ratio'> & { value: Ratio },
 *  LiquidationMargin: ParamRecord<'ratio'> & { value: Ratio },
 *  LoanFee: ParamRecord<'ratio'> & { value: Ratio },
 * }}
 */

/**
 * @typedef {Object} ParamManagerBase
 * @property {() => Record<Keyword, ParamShortDescription>} getParams
 * @property {(name: string) => Amount} getAmount
 * @property {(name: string) => Brand} getBrand
 * @property {(name: string) => Instance} getInstance
 * @property {(name: string) => Installation} getInstallation
 * @property {(name: string) => Amount} getInvitationAmount
 * @property {(name: string) => bigint} getNat
 * @property {(name: string) => Ratio} getRatio
 * @property {(name: string) => string} getString
 * @property {(name: string) => any} getUnknown
 * @property {(name: string, proposedValue: ParamValue) => ParamValue} getVisibleValue - for
 *   most types, the visible value is the same as proposedValue. For Invitations
 *   the visible value is the amount of the invitation.
 * @property {() => ParamDescriptions} getParamList
 * @property {(name: string) => Promise<Invitation>} getInternalParamValue
 * @property {() => Subscription<ParamDescription>} getSubscription
 */

/**
 * @typedef {{ [updater: string]: (arg: ParamValue) => void
 *  }} ParamManagerUpdaters
 * @typedef {ParamManagerBase & ParamManagerUpdaters} ParamManagerFull
 */

/**
 * @typedef {Iterable<ParamDescription>} ParamDescriptions
 */

/**
 * @typedef {Record<string, string[]>} ParameterNameList
 */

/**
 * @callback AssertParamManagerType
 * @param {ParamType} type
 * @param {ParamValue} value
 * @param {string} name
 */

/**
 * @callback BuildParamManager - ParamManager is a facility that governed
 *   contracts can use to manage their visible state in a way that allows the
 *   ContractGovernor to update values using governance. When paramManager is
 *   instantiated inside the contract, the contract has synchronous access to
 *   the values, and clients of the contract can verify that a ContractGovernor
 *   can change the values in a legible way.
 * @param {ParamDescriptions} paramDescriptions
 * @returns {ParamManagerFull}
 */

/**
 * @typedef {Object} ChangeParamPosition
 * @property {ParamSpecification} changeParam
 * @property {ParamValue} proposedValue
 */

/**
 * @typedef {Object} NoChangeParamPosition
 * @property {ParamSpecification} noChange
 */

/**
 * @typedef {Object} Governor
 * @property {CreateQuestion} createQuestion
 */

/**
 * @typedef {Object} GovernorPublic
 * @property {() => Promise<Instance>} getElectorate
 * @property {() => Promise<Instance>} getGovernedContract
 * @property {(voteCounter: Instance) => Promise<boolean>} validateVoteCounter
 * @property {(regP: ERef<Instance>) => Promise<boolean>} validateElectorate
 * @property {(details: QuestionDetails) => boolean} validateTimer
 */

/**
 * @typedef {Object} ParamKey
 * @property {string} key
 */

/**
 * @typedef {Object} ParamSpecification
 * @property {string} key
 * @property {string} parameterName
 */

/**
 * @typedef {Object} ParamChangeVoteResult
 * @property {Instance} instance - instance of the VoteCounter
 * @property {ERef<QuestionDetails>} details
 * @property {Promise<ParamValue>} outcomeOfUpdate - A promise for the result
 *    of updating the parameter value. Primarily useful for its behavior on
 *    rejection.
 */

/**
 * @typedef {Object} LimitedCreatorFacet
 *
 * The creatorFacet for the governed contract that will be passed to the
 * responsible party. It does not have access to the paramManager.
 * @property {() => Instance} getContractGovernor
 */

/**
 * @typedef {Object} ContractPowerfulCreatorFacet
 *
 *   A powerful facet that carries access to both the creatorFacet to be passed
 *   to the caller and the paramManager, which will be used exclusively by the
 *   ContractGovernor.
 * @property {() => Promise<LimitedCreatorFacet>} getLimitedCreatorFacet
 * @property {() => ParamManagerRetriever} getParamMgrRetriever
 */

/**
 * @typedef {Object} GovernedContractFacetAccess
 * @property {VoteOnParamChange} voteOnParamChange
 * @property {() => Promise<LimitedCreatorFacet>} getCreatorFacet - creator
 *   facet of the governed contract, without the tightly held ability to change
 *   param values.
 * @property {() => any} getPublicFacet - public facet of the governed contract
 * @property {() => Promise<Instance>} getInstance - instance of the governed
 *   contract
 */

/**
 * @typedef {Object} GovernedPublicFacet
 * @property {() => Subscription<ParamDescription>} getSubscription
 * @property {VoteOnParamChange} getContractGovernor
 * @property {GetGovernedVaultParams} getGovernedParams - get descriptions of
 *   all the governed parameters
 * @property {(name: string) => Amount} getAmount
 * @property {(name: string) => Brand} getBrand
 * @property {(name: string) => Instance} getInstance
 * @property {(name: string) => Installation} getInstallation
 * @property {(name: string) => Amount} getInvitationAmount
 * @property {(name: string) => bigint} getNat
 * @property {(name: string) => Ratio} getRatio
 * @property {(name: string) => string} getString
 * @property {(name: string) => any} getUnknown
 */

/**
 * @typedef {Object} GovernedCreatorFacet
 * @property {() => ParamManagerRetriever} getParamMgrRetriever - allows accessing
 *   and updating governed parameters. Should only be directly accessible to the
 *   contractGovernor
 * @property {() => LimitedCreatorFacet} getLimitedCreatorFacet - the creator
 *   facet of the governed contract. Doesn't provide access to any governance
 *   functionality
 * @property {(name: string) => Promise<Invitation>} getInvitation
 */

/**
 * @callback WrapPublicFacet
 * @param {any} originalPublicFacet
 * @returns {GovernedPublicFacet}
 */

/**
 * @callback WrapCreatorFacet
 * @param {any} originalCreatorFacet
 * @returns {GovernedCreatorFacet}
 */

/**
 * @typedef {Object} ParamGovernorBundle
 * @property {WrapPublicFacet} wrapPublicFacet
 * @property {WrapCreatorFacet} wrapCreatorFacet
 * @property {(name: string) => Amount} getAmount
 * @property {(name: string) => Brand} getBrand
 * @property {(name: string) => Instance} getInstance
 * @property {(name: string) => Installation} getInstallation
 * @property {(name: string) => Amount} getInvitationAmount
 * @property {(name: string) => bigint} getNat
 * @property {(name: string) => Ratio} getRatio
 * @property {(name: string) => string} getString
 * @property {(name: string) => any} getUnknown
 */

/**
 * @callback AssertBallotConcernsQuestion
 * @param {string} paramName
 * @param {QuestionDetails} questionDetails
 */

/**
 * @typedef {Object} ParamManagerRetriever
 * @property {(paramKey?: ParamKey) => ParamManagerFull} get
 */

/**
 * @callback VoteOnParamChange
 * @param {ParamSpecification} paramSpec
 * @param {ParamValue} proposedValue
 * @param {Installation} voteCounterInstallation
 * @param {bigint} deadline
 * @returns {ParamChangeVoteResult}
 */

/**
 * @typedef {Object} ParamGovernor
 * @property {VoteOnParamChange} voteOnParamChange
 * @property {CreatedQuestion} createdQuestion
 */

/**
 * @callback SetupGovernance
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<ParamManagerRetriever>} paramManagerRetriever
 * @param {Instance} contractInstance
 * @param {Timer} timer
 * @returns {ParamGovernor}
 */

/**
 * @callback CreatedQuestion
 *   Was this question created by this ContractGovernor?
 * @param {Instance} questionInstance
 * @returns {boolean}
 */

/**
 * @callback PositionIncluded
 * @param {Position[]} positions
 * @param {Position} position
 * @returns {boolean}
 */

/**
 * @typedef {Object} GovernedContractTerms
 * @property {Timer} timer
 * @property {IssuerKeywordRecord} issuerKeywordRecord
 * @property {Object} privateArgs
 */

/**
 * @typedef {Object} ContractGovernorTerms
 * @property {VoteOnParamChange} timer
 * @property {Instance} electorateInstance
 * @property {Installation} governedContractInstallation
 */

/**
 * @callback AssertContractGovernance
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} allegedGoverned
 * @param {Instance} allegedGovernor
 * @param {Installation} contractGovernorInstallation
 * @returns {Promise<GovernancePair>}
 */

/**
 * @callback AssertContractElectorate - assert that the contract uses the
 *   electorate
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} allegedGovernor
 * @param {Instance} allegedElectorate
 */

/**
 * @callback ValidateQuestionDetails
 *
 * Validate that the question details correspond to a parameter change question
 * that the electorate hosts, and that the voteCounter and other details are
 * consistent with it.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} electorate
 * @param {ParamChangeIssueDetails} details
 * @returns {Promise<*>}
 */

/**
 * @callback ValidateQuestionFromCounter
 *
 * Validate that the questions counted by the voteCounter correspond to a
 * parameter change question that the electorate hosts, and that the
 * voteCounter and other details are consistent.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} electorate
 * @param {Instance} voteCounter
 * @returns {Promise<*>}
 */

/**
 * @callback ValidateParamChangeQuestion
 *
 * Validate that the details are appropriate for an election concerning a
 * parameter change for a governed contract.
 *
 * @param {ParamChangeIssueDetails} details
 */

/**
 * @typedef {Object} ParamManagerBuilder
 * @property {(name: string, value: Amount) => ParamManagerBuilder} addAmount
 * @property {(name: string, value: Amount) => ParamManagerBuilder} addBrandedAmount
 * @property {(name: string, value: Brand) => ParamManagerBuilder} addBrand
 * @property {(name: string, value: Installation) => ParamManagerBuilder} addInstallation
 * @property {(name: string, value: Instance) => ParamManagerBuilder} addInstance
 * @property {(name: string, value: Invitation) => Promise<ParamManagerBuilder>} addInvitation
 * @property {(name: string, value: bigint) => ParamManagerBuilder} addNat
 * @property {(name: string, value: Ratio) => ParamManagerBuilder} addRatio
 * @property {(name: string, value: Ratio) => ParamManagerBuilder} addBrandedRatio
 * @property {(name: string, value: string) => ParamManagerBuilder} addString
 * @property {(name: string, value: any) => ParamManagerBuilder} addUnknown
 * @property {() => ParamManagerFull} build
 */
