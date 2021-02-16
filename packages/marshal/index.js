export {
  REMOTE_STYLE,
  getInterfaceOf,
  pureCopy,
  QCLASS,
  getErrorConstructor,
  sameValueZero,
  passStyleOf,
  makeMarshal,
  Remotable,
  Far,
} from './src/marshal';

// Commenting out the following reexport prevents the error seen at
// https://github.com/Agoric/agoric-sdk/pull/2437/checks?check_run_id=1909543649
// This is crazy because reexporting something that no one imports should
// not be able to cause an error. If anyone was importing it, then
// commenting out the export should cause an error, which it does not.
// Reported at https://github.com/Agoric/agoric-sdk/issues/2439
// TODO Investigate. This anomaly may be a big deal.
//
export { stringify, parse } from './src/marshal-stringify';
