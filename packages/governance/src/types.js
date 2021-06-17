// @ts-check

/**
 * @typedef { 'amount' | 'brand' | 'installation' | 'instance' | 'nat' | 'ratio' | 'string' | 'unknown' } ParamType
 */

/**
 * @typedef { Amount | Brand | Installation | Instance | bigint | Ratio | string | unknown } ParamValue
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
