import { Fail } from '@endo/errors';
import { makeWorkerOptions } from './workerOptions.js';

export const makeVatOptionRecorder = (kernelKeeper, bundleHandler) => {
  const record = async (vatID, source, options) => {
    const {
      name,
      vatParameters = undefined,
      enableSetup = false,
      enablePipelining = false,
      enableDisavow = false,
      useTranscript = true,
      reapInterval = kernelKeeper.getDefaultReapInterval(),
      critical = false,
      meterID = undefined,
      managerType = kernelKeeper.getDefaultManagerType(),
      nodeOptions = undefined,
      ...leftover
    } = options;
    const unused = Object.keys(leftover);
    if (unused.length) {
      Fail`OptionRecorder: ${vatID} unused options ${unused.join(',')}`;
    }
    const workerOptions = await makeWorkerOptions(
      managerType,
      bundleHandler,
      nodeOptions,
    );
    /** @type { import('../types-internal.js').RecordedVatOptions } */
    const vatOptions = harden({
      workerOptions,
      name,
      vatParameters,
      enableSetup,
      enablePipelining,
      enableDisavow,
      useTranscript,
      reapInterval,
      critical,
      meterID,
    });
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    vatKeeper.setSourceAndOptions(source, vatOptions);
    vatKeeper.initializeReapCountdown(vatOptions.reapInterval);
  };

  /**
   * Convert an StaticVatOptions (from the config.vats definition)
   * into a RecordedVatOptions, sampling and populating the current
   * defaults. Store it.
   *
   * @param {string} vatID
   * @param {*} source
   * @param {import('../types-external.js').StaticVatOptions} staticOptions
   * @returns {Promise<void>}
   */
  const recordStatic = (vatID, source, staticOptions) => {
    const options = { ...staticOptions, meterID: undefined };
    return record(vatID, source, options);
  };

  /**
   * Convert an InternalDynamicVatOptions (from the run-queue
   * 'create-vat' event) into a RecordedVatOptions, sampling and
   * populating the current defaults. Store it.
   *
   * @param {string} vatID
   * @param {*} source
   * @param {import('../types-internal.js').InternalDynamicVatOptions} dynamicOptions
   * @returns {Promise<void>}
   */
  const recordDynamic = (vatID, source, dynamicOptions) => {
    const options = { ...dynamicOptions, enableDisavow: false };
    return record(vatID, source, options);
  };

  return { recordStatic, recordDynamic };
};
