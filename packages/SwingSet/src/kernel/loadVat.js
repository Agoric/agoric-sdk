// @ts-check
import { assert } from '@agoric/assert';
import { assertKnownOptions } from '../assertOptions.js';
import { makeVatSlot } from '../parseVatSlots.js';
import { makeVatTranslators } from './vatTranslator.js';

export function makeVatRootObjectSlot() {
  return makeVatSlot('object', true, 0n);
}

export function makeVatLoader(stuff) {
  const {
    overrideVatManagerOptions = {},
    vatManagerFactory,
    kernelSlog,
    makeVatConsole,
    kernelKeeper,
    panic,
    buildVatSyscallHandler,
    vatAdminRootKref,
  } = stuff;

  /**
   * Create a new vat at runtime (called when a 'create-vat' event reaches
   * the top of the run-queue).
   *
   * @param { string } vatID  The pre-allocated vatID
   * @param { BundleID } bundleID  which source bundle to use
   * @param { ReturnType<makeVatTranslators> } translators
   * @param {*} dynamicOptions  Options bag governing vat creation
   *
   * @returns {Promise<VatManager>}
   */
  function createVatDynamically(
    vatID,
    bundleID,
    translators,
    dynamicOptions = {},
  ) {
    assert(vatAdminRootKref, `initializeKernel did not set vatAdminRootKref`);
    // eslint-disable-next-line no-use-before-define
    return create(vatID, bundleID, translators, dynamicOptions, true);
  }

  /**
   * Recreate a dynamic vat from persistent state at kernel startup time.
   *
   * @param {string} vatID  The vatID of the vat to create
   * @param { BundleID } bundleID  which source bundle to use
   * @param { ReturnType<makeVatTranslators> } translators
   * @param {*} dynamicOptions  Options bag governing vat creation
   *
   * @returns {Promise<VatManager>} fires when the vat is ready for messages
   */
  function recreateDynamicVat(vatID, bundleID, translators, dynamicOptions) {
    // eslint-disable-next-line no-use-before-define
    return create(vatID, bundleID, translators, dynamicOptions, true).catch(
      err => {
        panic(`unable to re-create vat ${vatID}`, err);
        throw err;
      },
    );
    // if we fail to recreate the vat during replay, crash the kernel,
    // because we no longer have any way to inform the original caller
  }

  /**
   * Recreate a static vat from persistent state at kernel startup time.
   *
   * @param {string} vatID  The vatID of the vat to create
   * @param { BundleID } bundleID  which source bundle to use
   * @param { ReturnType<makeVatTranslators> } translators
   * @param {*} staticOptions  Options bag governing vat creation
   *
   * @returns {Promise<VatManager>} A Promise which fires when the
   * vat is ready for messages.
   */
  function recreateStaticVat(vatID, bundleID, translators, staticOptions) {
    // eslint-disable-next-line no-use-before-define
    return create(vatID, bundleID, translators, staticOptions, false).catch(
      err => {
        panic(`unable to re-create vat ${vatID}`, err);
        throw err;
      },
    );
  }

  const allowedDynamicOptions = [
    'description',
    'meterID',
    'managerType', // TODO: not sure we want vats to be able to control this
    'vatParameters',
    'enableSetup',
    'enablePipelining',
    'enableVatstore',
    'virtualObjectCacheSize',
    'useTranscript',
    'reapInterval',
  ];

  const allowedStaticOptions = [
    'description',
    'name',
    'vatParameters',
    'managerType',
    'enableDisavow',
    'enableSetup',
    'enablePipelining',
    'enableVatstore',
    'virtualObjectCacheSize',
    'useTranscript',
    'reapInterval',
  ];

  /**
   * Instantiate a new vat.  The root object will be available soon, but we
   * immediately return the vatID so the ultimate requestor doesn't have to
   * wait.
   *
   * @param {string} vatID  The vatID for the new vat
   *
   * @param {BundleID} bundleID which source bundle to use
   *
   * @param { ReturnType<makeVatTranslators> } translators
   *
   * @param {Object} options  an options bag. These options are currently understood:
   *
   * @param {ManagerType} options.managerType
   *
   * @param {number} options.virtualObjectCacheSize
   *
   * @param {string} [options.meterID] If a meterID is provided, the new
   *        dynamic vat is limited to a fixed amount of computation and
   *        allocation that can occur during any given crank. Peak stack
   *        frames are limited as well. In addition, the given meter's
   *        "remaining" value will be reduced by the amount of computation
   *        used by each crank. The meter will eventually underflow unless it
   *        is topped up, at which point the vat is terminated. If undefined,
   *        the vat is unmetered. Static vats cannot be metered.
   *
   * @param {Record<string, unknown>} [options.vatParameters] provides
   *        the contents of the second argument to
   *        'buildRootObject()'.  Defaults to `{}`.
   *
   * @param {boolean} [options.enableSetup] If true,
   *        permits the vat to construct itself using the
   *        `setup()` API, which bypasses the imposition of LiveSlots but
   *        requires the vat implementation to enforce the vat invariants
   *        manually.  If false, the vat will be constructed using the
   *        `buildRootObject()` API, which uses LiveSlots to enforce the vat
   *        invariants automatically.  Defaults to false.
   *
   * @param {boolean} [options.enablePipelining] If true,
   *        permits the kernel to pipeline messages to
   *        promises for which the vat is the decider directly to the vat
   *        without waiting for the promises to be resolved.  If false, such
   *        messages will be queued inside the kernel.  Defaults to false.
   *
   * @param {boolean} [options.enableVatstore] If true, the vat is provided with
   *        an object that allows individual keyed access (in an insolated
   *        subset of the key space) to the vatstore.  Defaults to false.
   *
   * @param {boolean} [options.useTranscript] If true, saves a transcript of a
   *        vat's inbound deliveries and outbound syscalls so that the vat's
   *        internal state can be reconstructed via replay.  If false, no such
   *        record is kept.  Defaults to true.
   *
   * @param {number|'never'} [options.reapInterval] The interval (measured
   *        in number of deliveries to the vat) after which the kernel will
   *        deliver the 'bringOutYourDead' directive to the vat.  If the value
   *        is 'never', 'bringOutYourDead' will never be delivered and the vat
   *        will be responsible for internally managing (in a deterministic
   *        manner) any visible effects of garbage collection.  Defaults to the
   *        kernel's configured 'defaultReapInterval' value.
   *
   * @param {string} [options.name]
   * @param {string} [options.description]
   * @param {boolean} [options.enableDisavow]
   *
   * @param {boolean} isDynamic  If true, the vat being created is a dynamic vat;
   *    if false, it's a static vat (these have differences in their allowed
   *    options and some of their option defaults).
   *
   * @returns {Promise<VatManager>} A Promise which fires when the
   * vat is ready for messages.
   */
  async function create(vatID, bundleID, translators, options, isDynamic) {
    const vatSourceBundle = kernelKeeper.getBundle(bundleID);
    assert(vatSourceBundle, `unknown bundleID ${bundleID}`);
    const sourceDesc = `from bundleID: ${bundleID}`;
    assert.typeof(vatSourceBundle, 'object', `vat creation requires bundle`);

    assertKnownOptions(
      options,
      isDynamic ? allowedDynamicOptions : allowedStaticOptions,
    );
    const {
      meterID,
      vatParameters = {},
      managerType,
      enableSetup = false,
      enableDisavow = false,
      enablePipelining = false,
      enableVatstore = false,
      virtualObjectCacheSize,
      useTranscript = true,
      name,
    } = options;

    const description = `${options.description || ''} (${sourceDesc})`.trim();

    const { starting } = kernelSlog.provideVatSlogger(
      vatID,
      isDynamic,
      description,
      name,
      vatSourceBundle,
      managerType,
      vatParameters,
    );

    const managerOptions = {
      managerType,
      bundle: vatSourceBundle,
      metered: !!meterID,
      enableDisavow,
      enableSetup,
      enablePipelining,
      vatConsole: makeVatConsole('vat', vatID),
      liveSlotsConsole: makeVatConsole('ls', vatID),
      vatParameters,
      enableVatstore,
      virtualObjectCacheSize,
      useTranscript,
      name,
      ...overrideVatManagerOptions,
    };

    const vatSyscallHandler = buildVatSyscallHandler(vatID, translators);

    const finish = starting && kernelSlog.startup(vatID);
    const manager = await vatManagerFactory(
      vatID,
      managerOptions,
      vatSyscallHandler,
    );
    starting && finish();
    return manager;
  }

  async function loadTestVat(vatID, setup, creationOptions) {
    const managerOptions = {
      ...creationOptions,
      setup,
      enableSetup: true,
      managerType: 'local',
      useTranscript: true,
      ...overrideVatManagerOptions,
    };
    const translators = makeVatTranslators(vatID, kernelKeeper);
    const vatSyscallHandler = buildVatSyscallHandler(vatID, translators);
    const manager = await vatManagerFactory(
      vatID,
      managerOptions,
      vatSyscallHandler,
    );
    return manager;
  }

  return harden({
    createVatDynamically,
    recreateDynamicVat,
    recreateStaticVat,
    loadTestVat,
  });
}
