import { Either } from './helpers/adts.js';

const { Right, Left } = Either;
// /**
//  * isHexString
//  * @desc Returns true if value is a hex string.
//  * @param {String} value
//  * @return {Boolean}
//  *
//  * @example
//  * ```js
//  * isHexString('0x1234')
//  *```
//  */

const isHexValue = x =>
  /^(0x)?[0-9A-Fa-f]*$/.test(x)
    ? Right(x)
    : Left(new Error('Input value is not in hex format.'));
const isString = x =>
  typeof x === 'string' ? Right(x) : Left('Input value is not a string.');

const isHexString = x => isString(x).chain(isHexValue);

export { isHexString };
