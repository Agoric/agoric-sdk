export function makeTracer(tracer) {
  const asyncTracer = (func, component, namer) => {
    return async (...args) => {
      let name = func.name;
      if (namer !== undefined) {
        name = namer(...args);
      }

      return tracer.trace(name, { service: component }, async () => {
        return func(...args);
      });
    };
  };

  const syncTracer = (func, component, namer) => {
    return (...args) => {
      let name = func.name;
      if (namer !== undefined) {
        name = namer(...args);
      }
      return tracer.trace(name, { service: component }, () => {
        return func(...args);
      });
    };
  };

  const funcTracer = (func, component, namer) => {
    if (
      func !== undefined &&
      func.constructor !== undefined &&
      func.constructor.name === 'AsyncFunction'
    ) {
      return asyncTracer(func, component, namer);
    } else {
      return syncTracer(func, component, namer);
    }
  };

  function makeHandleCommand(handleCommand) {
    if (tracer === undefined) {
      return handleCommand;
    }

    const handleCommandTraced = args => {
      return tracer.trace('handleCommand', { service: 'xsnap' }, () => {
        return handleCommand(args);
      });
    };

    return harden(handleCommandTraced);
  }

  function makeController(controller) {
    if (tracer === undefined) {
      return controller;
    }
    const aTracer = (func, namer) => {
      return asyncTracer(func, 'controller', namer);
    };

    const { run, step, ...rest } = controller;

    return harden({
      run: aTracer(run),
      step: aTracer(step),
      ...rest,
    });
  }

  function makeKernel(kernel) {
    if (tracer === undefined) {
      return kernel;
    }

    const aTracer = (func, namer) => {
      return funcTracer(func, 'kernel', namer);
    };

    const {
      processDeliveryMessage,
      deliveryCrankResults,
      getNextMessageAndProcessor,
      processAcceptanceMessage,
      run,
      ...rest
    } = kernel;

    return harden({
      run: aTracer(run),
      processDeliveryMessage: aTracer(processDeliveryMessage),
      processAcceptanceMessage: aTracer(processAcceptanceMessage),
      deliveryCrankResults: aTracer(deliveryCrankResults),
      getNextMessageAndProcessor: aTracer(getNextMessageAndProcessor),
      ...rest,
    });
  }

  function makeVatSlog(slogger) {
    if (tracer === undefined) {
      return slogger;
    }

    const aTracer = (func, namer) => {
      return funcTracer(func, 'slogger', namer);
    };

    const {
      vatConsole,
      startup,
      delivery,
      syscall,
      changeCList,
      terminateVat,
      ...rest
    } = slogger;

    return harden({
      vatConsole: aTracer(vatConsole),
      startup: aTracer(startup),
      delivery: aTracer(delivery),
      syscall: aTracer(syscall),
      changeCList: aTracer(changeCList),
      terminateVat: aTracer(terminateVat),
      ...rest,
    });
  }

  function makeKernelSyscall(kernelSyscallHandler) {
    if (tracer === undefined) {
      return kernelSyscallHandler;
    }

    const kernelSyscallHandlerTraced = ksc => {
      return tracer.trace(
        `${ksc[0]}`,
        { service: 'kernelSyscall', tags: { arg1: `${ksc[1]}` } },
        () => {
          return kernelSyscallHandler(ksc);
        },
      );
    };

    return harden(kernelSyscallHandlerTraced);
  }

  function makeVatTranslators(vatTranslator) {
    if (tracer === undefined) {
      return vatTranslator;
    }

    const aTracer = (func, namer) => {
      return funcTracer(func, 'vatTranslator', namer);
    };

    const {
      kernelDeliveryToVatDelivery,
      vatSyscallToKernelSyscall,
      kernelSyscallResultToVatSyscallResult,
      ...rest
    } = vatTranslator;

    return {
      kernelDeliveryToVatDelivery: aTracer(kernelDeliveryToVatDelivery),
      vatSyscallToKernelSyscall: aTracer(vatSyscallToKernelSyscall),
      kernelSyscallResultToVatSyscallResult: aTracer(
        kernelSyscallResultToVatSyscallResult,
      ),
      ...rest,
    };
  }

  function makeVatWarehouse(vatWarehouse) {
    if (tracer === undefined) {
      return vatWarehouse;
    }

    const aTracer = (func, namer) => {
      return funcTracer(func, 'vatWarehouse', namer);
    };

    const {
      start,
      createDynamicVat,
      loadTestVat,
      lookup,
      kernelDeliveryToVatDelivery,
      deliverToVat,
      maybeSaveSnapshot,
      setSnapshotInterval,
      beginNewWorkerIncarnation,
      stopWorker,
      activeVatsInfo,
      shutdown,
      ...rest
    } = vatWarehouse;

    return {
      start: aTracer(start),
      createDynamicVat: aTracer(createDynamicVat),
      loadTestVat: aTracer(loadTestVat),
      lookup: aTracer(lookup),
      kernelDeliveryToVatDelivery: aTracer(kernelDeliveryToVatDelivery),
      deliverToVat: aTracer(deliverToVat),
      maybeSaveSnapshot: aTracer(maybeSaveSnapshot),
      setSnapshotInterval: aTracer(setSnapshotInterval),
      beginNewWorkerIncarnation: aTracer(beginNewWorkerIncarnation),
      stopWorker: aTracer(stopWorker),
      activeVatsInfo: aTracer(activeVatsInfo),
      shutdown: aTracer(shutdown),
      ...rest,
    };
  }

  function makeKernelKeeper(kernelKeeper) {
    if (tracer === undefined) {
      return kernelKeeper;
    }

    const aTracer = (func, namer) => {
      return funcTracer(func, 'kernelKeeper', namer);
    };

    const {
      getInitialized,
      setInitialized,
      createStartingKernelState,
      getDefaultManagerType,
      getDefaultReapInterval,
      getRelaxDurabilityRules,
      setDefaultReapInterval,
      getSnapshotInitial,
      getSnapshotInterval,
      setSnapshotInterval,
      addNamedBundleID,
      getNamedBundleID,
      addBundle,
      hasBundle,
      getBundle,
      getCrankNumber,
      incrementCrankNumber,
      processRefcounts,
      incStat,
      decStat,
      saveStats,
      loadStats,
      getStats,
      getGCActions,
      setGCActions,
      addGCActions,
      scheduleReap,
      nextReapAction,
      addKernelObject,
      ownerOfKernelObject,
      ownerOfKernelDevice,
      kernelObjectExists,
      getImporters,
      orphanKernelObject,
      deleteKernelObject,
      pinObject,
      addKernelPromise,
      addKernelPromiseForVat,
      getKernelPromise,
      getResolveablePromise,
      hasKernelPromise,
      requeueKernelPromise,
      resolveKernelPromise,
      addMessageToPromiseQueue,
      addSubscriberToPromise,
      setDecider,
      clearDecider,
      enumeratePromisesByDecider,
      incrementRefCount,
      decrementRefCount,
      getObjectRefCount,
      enumerateNonDurableObjectExports,
      addToRunQueue,
      getRunQueueLength,
      getNextRunQueueMsg,
      addToAcceptanceQueue,
      getAcceptanceQueueLength,
      getNextAcceptanceQueueMsg,
      allocateMeter,
      addMeterRemaining,
      setMeterThreshold,
      getMeter,
      checkMeter,
      deductMeter,
      deleteMeter,
      hasVatWithName,
      getVatIDForName,
      allocateVatIDForNameIfNeeded,
      allocateUnusedVatID,
      provideVatKeeper,
      vatIsAlive,
      evictVatKeeper,
      cleanupAfterTerminatedVat,
      addDynamicVatID,
      getDynamicVats,
      getStaticVats,
      getDevices,
      allocateUpgradeID,
      getDeviceIDForName,
      allocateDeviceIDForNameIfNeeded,
      allocateDeviceKeeperIfNeeded,
      startCrank,
      establishCrankSavepoint,
      rollbackCrank,
      emitCrankHashes,
      endCrank,
      ...rest
    } = kernelKeeper;

    return harden({
      getInitialized: aTracer(getInitialized),
      setInitialized: aTracer(setInitialized),
      createStartingKernelState: aTracer(createStartingKernelState),
      getDefaultManagerType: aTracer(getDefaultManagerType),
      getDefaultReapInterval: aTracer(getDefaultReapInterval),
      getRelaxDurabilityRules: aTracer(getRelaxDurabilityRules),
      setDefaultReapInterval: aTracer(setDefaultReapInterval),
      getSnapshotInitial: aTracer(getSnapshotInitial),
      getSnapshotInterval: aTracer(getSnapshotInterval),
      setSnapshotInterval: aTracer(setSnapshotInterval),
      addNamedBundleID: aTracer(addNamedBundleID),
      getNamedBundleID: aTracer(getNamedBundleID),
      addBundle: aTracer(addBundle),
      hasBundle: aTracer(hasBundle),
      getBundle: aTracer(getBundle),
      getCrankNumber: aTracer(getCrankNumber),
      incrementCrankNumber: aTracer(incrementCrankNumber),
      processRefcounts: aTracer(processRefcounts),
      incStat: aTracer(incStat),
      decStat: aTracer(decStat),
      saveStats: aTracer(saveStats),
      loadStats: aTracer(loadStats),
      getStats: aTracer(getStats),
      getGCActions: aTracer(getGCActions),
      setGCActions: aTracer(setGCActions),
      addGCActions: aTracer(addGCActions),
      scheduleReap: aTracer(scheduleReap),
      nextReapAction: aTracer(nextReapAction),
      addKernelObject: aTracer(addKernelObject),
      ownerOfKernelObject: aTracer(ownerOfKernelObject),
      ownerOfKernelDevice: aTracer(ownerOfKernelDevice),
      kernelObjectExists: aTracer(kernelObjectExists),
      getImporters: aTracer(getImporters),
      orphanKernelObject: aTracer(orphanKernelObject),
      deleteKernelObject: aTracer(deleteKernelObject),
      pinObject: aTracer(pinObject),
      addKernelPromise: aTracer(addKernelPromise),
      addKernelPromiseForVat: aTracer(addKernelPromiseForVat),
      getKernelPromise: aTracer(getKernelPromise),
      getResolveablePromise: aTracer(getResolveablePromise),
      hasKernelPromise: aTracer(hasKernelPromise),
      requeueKernelPromise: aTracer(requeueKernelPromise),
      resolveKernelPromise: aTracer(resolveKernelPromise),
      addMessageToPromiseQueue: aTracer(addMessageToPromiseQueue),
      addSubscriberToPromise: aTracer(addSubscriberToPromise),
      setDecider: aTracer(setDecider),
      clearDecider: aTracer(clearDecider),
      enumeratePromisesByDecider: aTracer(enumeratePromisesByDecider),
      incrementRefCount: aTracer(incrementRefCount),
      decrementRefCount: aTracer(decrementRefCount),
      getObjectRefCount: aTracer(getObjectRefCount),
      enumerateNonDurableObjectExports: aTracer(
        enumerateNonDurableObjectExports,
      ),
      addToRunQueue: aTracer(addToRunQueue),
      getRunQueueLength: aTracer(getRunQueueLength),
      getNextRunQueueMsg: aTracer(getNextRunQueueMsg),
      addToAcceptanceQueue: aTracer(addToAcceptanceQueue),
      getAcceptanceQueueLength: aTracer(getAcceptanceQueueLength),
      getNextAcceptanceQueueMsg: aTracer(getNextAcceptanceQueueMsg),
      allocateMeter: aTracer(allocateMeter),
      addMeterRemaining: aTracer(addMeterRemaining),
      setMeterThreshold: aTracer(setMeterThreshold),
      getMeter: aTracer(getMeter),
      checkMeter: aTracer(checkMeter),
      deductMeter: aTracer(deductMeter),
      deleteMeter: aTracer(deleteMeter),
      hasVatWithName: aTracer(hasVatWithName),
      getVatIDForName: aTracer(getVatIDForName),
      allocateVatIDForNameIfNeeded: aTracer(allocateVatIDForNameIfNeeded),
      allocateUnusedVatID: aTracer(allocateUnusedVatID),
      provideVatKeeper: aTracer(provideVatKeeper),
      vatIsAlive: aTracer(vatIsAlive),
      evictVatKeeper: aTracer(evictVatKeeper),
      cleanupAfterTerminatedVat: aTracer(cleanupAfterTerminatedVat),
      addDynamicVatID: aTracer(addDynamicVatID),
      getDynamicVats: aTracer(getDynamicVats),
      getStaticVats: aTracer(getStaticVats),
      getDevices: aTracer(getDevices),
      allocateUpgradeID: aTracer(allocateUpgradeID),
      getDeviceIDForName: aTracer(getDeviceIDForName),
      allocateDeviceIDForNameIfNeeded: aTracer(allocateDeviceIDForNameIfNeeded),
      allocateDeviceKeeperIfNeeded: aTracer(allocateDeviceKeeperIfNeeded),
      startCrank: aTracer(startCrank),
      establishCrankSavepoint: aTracer(establishCrankSavepoint),
      rollbackCrank: aTracer(rollbackCrank),
      emitCrankHashes: aTracer(emitCrankHashes),
      endCrank: aTracer(endCrank),
      ...rest,
    });
  }

  return {
    makeController,
    makeKernel,
    makeVatSlog,
    makeKernelSyscall,
    makeVatWarehouse,
    makeKernelKeeper,
    makeVatTranslators,
    makeHandleCommand,
  };
}
