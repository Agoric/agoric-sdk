/**
 * @typedef {object} QuestionRecord
 * @property {ERef<VoteCounterCreatorFacet>} voteCap
 * @property {VoteCounterPublicFacet} publicFacet
 * @property {Timestamp} deadline
 */

/**
 * @callback StartCounter
 * @param {ZCF} zcf
 * @param {QuestionSpec} questionSpec
 * @param {unknown} quorumThreshold
 * @param {ERef<Installation>} voteCounter
 * @param {Store<Handle<'Question'>, QuestionRecord>} questionStore
 * @param {IterationObserver<unknown>} publication
 * @returns {AddQuestionReturn}
 */
