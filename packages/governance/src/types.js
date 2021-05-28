// @ts-check

/**
 * @typedef {'nat' | 'bigint' | 'string' | 'ratio' | 'amount' | 'brand' } ParamType
 */

/**
 * @typedef  {Object} ParamManager
 * @property {(name: string, value: any) => void} update
 */

/**
 * @typedef  {Object} ParamManagerPublic
 * @property {(name: string) => any} lookup
 */

/**
 * @typedef  {{name: string,
 *             value: any,
 *             type: string,
 *             }} ParamDescription
 */

// type: string above should be type: ParamType

/**
 * @typedef {Array<ParamDescription>} ParamDescriptions
 */

/**
 * @callback BuildParamManager
 * @param {ParamDescriptions} paramDesc
 * @returns {{publicFacet: ParamManagerPublic, manager: ParamManager }}
 */
