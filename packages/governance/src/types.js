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
 * @typedef  {Object} ParamManagerPublic
 * ParamManagerPublic also has updateFoo methods for each defined parameter.
 * @property {() => Record<Keyword,ParamDescription>} getParams
 */

/**
 * @typedef {Array<ParamDescription>} ParamDescriptions
 */

/**
 * @callback BuildParamManager
 * @param {ParamDescriptions} paramDesc
 * @returns {ParamManagerPublic}
 */
