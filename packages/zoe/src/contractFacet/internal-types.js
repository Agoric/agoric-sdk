// @ts-check

/**
 * @typedef {( {zcf: ZCF} ) => void} TestJigSetter
 */

/**
 * @typedef ZCFZygote
 * @property {(bundleOrBundleCap: SourceBundle | BundleCap) => void} evaluateContract
 * @property {(instanceAdminFromZoe: ERef<ZoeInstanceAdmin>,
 *     instanceRecordFromZoe: InstanceRecord,
 *     issuerStorageFromZoe: IssuerRecords,
 *     privateArgs?: object,
 * ) => Promise<ExecuteContractResult>} startContract
 */
