// @jessie-check

/**
 * @typedef {( {zcf}: {zcf: ZCF} ) => void} TestJigSetter
 */

/**
 * @typedef ZCFZygote
 * @property {(instanceAdminFromZoe: ERef<ZoeInstanceAdmin>,
 *     instanceRecordFromZoe: InstanceRecord,
 *     issuerStorageFromZoe: IssuerRecords,
 *     privateArgs?: object,
 * ) => Promise<ExecuteContractResult>} startContract
 * @property {(privateArgs?: object) => void} restartContract
 */
