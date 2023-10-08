// @ts-nocheck
import { krefOf, kser, kslot, kunser } from '@agoric/kmarshal';
import { extractMessage } from './vat-util.js';

/**
 * A testing vat that generically exposes kernel interactions
 * which are normally handled by liveslots.
 */

/**
 * @param {string} vpid - vat-centric promise ID p+NN
 * @param {boolean} isRejection
 * @param {unknown} value - fulfillment or rejection value
 * @returns {VatOneResolution[]}
 */
const promiseSettlement = (vpid, isRejection, value) => [
  [vpid, isRejection, kser(value)],
];
const promiseFulfillment = (vpid, value) =>
  promiseSettlement(vpid, false, value);
const promiseRejection = (vpid, reason) =>
  promiseSettlement(vpid, true, reason);

export default function setup(syscall, _state, _helpers, vatPowers) {
  // eslint-disable-next-line no-unused-vars
  const { testLog } = vatPowers;

  let vatName;
  let lastExportID = 99;
  const incExportID = () => {
    lastExportID += 1;
    return lastExportID;
  };
  /** @type {KernelDeliveryObject[]} */
  const dispatchLog = [];

  /**
   * Process an inbound message.
   *
   * @param {KernelDeliveryObject} vatDeliverObject
   * @returns {void}
   */
  function dispatch(vatDeliverObject) {
    dispatchLog.push(vatDeliverObject);

    // Capture initial configuration.
    const deliveryType = vatDeliverObject[0];
    if (deliveryType === 'startVat') {
      const vatParameters = kunser(vatDeliverObject[1]) || {};
      const newVatName = vatParameters.vatName;
      if (newVatName !== undefined) {
        vatName = newVatName;
      }
    }

    // React only to message deliveries.
    if (deliveryType !== 'message') {
      return;
    }

    const {
      method,
      args: argsCapdata,
      result,
    } = extractMessage(vatDeliverObject);
    // Default to resolving a result promise with `undefined`.
    /** @type {VatOneResolution[]} */
    let resolutions = promiseFulfillment(result, undefined);
    try {
      // Supported methods should have names that indicate what they
      // cause this vat to do but (for greppability) should not
      // duplicate names that appear in actual kernel/liveslots code.
      switch (method) {
        case 'getDispatchLog':
          // Return a copy of dispatchLog so the original remains mutable.
          resolutions = promiseFulfillment(result, dispatchLog.slice());
          break;

        case 'acceptImports':
          break;
        case 'acceptWeakImports':
          syscall.dropImports(argsCapdata.slots);
          break;

        case 'exportFakeObject': {
          // Currently limited to ephemeral objects
          // (i.e., non-virtual and non-durable).
          const vref = `o+${incExportID()}`;
          resolutions = promiseFulfillment(
            result,
            kslot(vref, `Fake Remotable ${vatName} ${vref}`),
          );
          break;
        }

        case 'syscall-send': {
          const [sendTarget, sendMethod, sendArgs] = kunser(argsCapdata);
          const sendTargetVref = krefOf(sendTarget);
          // Currently limited to send-only (i.e., no resultVPID).
          syscall.send(sendTargetVref, kser([sendMethod, sendArgs]));
          break;
        }

        default:
          throw Error(`unrecognized method ${method}`);
      }
    } catch (err) {
      resolutions = promiseRejection(result, err);
    }
    if (result) {
      syscall.resolve(resolutions);
    }
  }
  return dispatch;
}
