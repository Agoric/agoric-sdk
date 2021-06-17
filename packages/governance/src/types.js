// @ts-check

/**
 * @typedef { 'amount' | 'unknown' | 'brand' | 'installation' | 'instance' | 'nat' | 'ratio' | 'string' } ParamType
 */

/**
 * @typedef { Amount | Brand | Instance| Installation | bigint | Ratio | string | unknown } ParamValue
 */

/**
 * @typedef  {Object} ParamDetails
 * @property {string} name
 * @property {ParamValue} value
 * @property {ParamType} type
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
 * @typedef {{ [updater: string]: (arg: any) => void }} ParamManagerUpdaters
 * @typedef {ParamManagerBase & ParamManagerUpdaters} ParamManagerPublic
 */

/**
 * @typedef {Array<ParamDescription>} ParamDescriptions
 */

/**
 * @callback BuildParamManager
 * @param {ParamDescriptions} paramDesc
 * @returns {ParamManagerPublic}
 */
