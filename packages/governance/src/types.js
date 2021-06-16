// @ts-check

/**
 * @typedef { 'amount' | 'any' | 'brand' | 'installation' | 'instance' | 'nat' | 'ratio' | 'string' } ParamType
 */

/**
 * @typedef { Amount | Brand | Instance| Installation | bigint | Ratio | string | any } ParamValue
 */

/**
 * @typedef  {Object} ParamManager
 * @property {(name: string, value: ParamValue) => void} update
 */

/**
 * @typedef  {Object} ParamDetails
 * @property {string} name
 * @property {ParamValue} value
 * @property {ParamType} type
 */

/**
 * @typedef  {Object} ParamManagerPublic
 * @property {(name: string) => ParamValue} lookup
 * @property {(name: string) => ParamDetails} getDetails
 * @property {() => string[]} definedNames
 */

/**
 * @typedef {Object} ParamDescription
 * @property {string} name
 * @property {ParamValue} value
 * @property {ParamType} type
 */

/**
 * @typedef {Array<ParamDescription>} ParamDescriptions
 */

/**
 * @callback BuildParamManager
 * @param {ParamDescriptions} paramDesc
 * @returns {{params: ParamManagerPublic, manager: ParamManager }}
 */
