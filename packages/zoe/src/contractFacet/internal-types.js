/**
 * @callback ExecuteContract
 * @param {SourceBundle} bundle
 * @param {ERef<ZoeService>} zoeService
 * @param {Issuer} invitationIssuer
 * @param {ERef<ZoeInstanceAdmin>} zoeInstanceAdmin
 * @param {InstanceRecord} instanceRecordFromZoe
 * @param {IssuerRecords} issuerStorageFromZoe
 * @returns {Promise<ExecuteContractResult>}
 */

/**
 * @callback MakeZCFZygote
 *
 * Make the ZCF vat in zygote-usable form. First, a generic ZCF is
 * made, then the contract code is evaluated, then a particular
 * instance is made.
 *
 * @param {VatPowers} powers
 * @param {ERef<ZoeServiceWChargeAccount>} zoeService
 * @param {Issuer} invitationIssuer
 * @param {Function | undefined} testJigSetter
 * @returns {ZCFZygote}
 */

/**
 * @typedef ZCFZygote
 * @property {(bundle: SourceBundle) => void} evaluateContract
 * @property {(instanceAdminFromZoe: ERef<ZoeInstanceAdmin>,
      instanceRecordFromZoe: InstanceRecord,
      issuerStorageFromZoe: IssuerRecords) => Promise<ExecuteContractResult>} startContract
 */
