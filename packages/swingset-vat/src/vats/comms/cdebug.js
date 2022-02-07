let enableCDebug = false;

export function cdebugEnable(flag) {
  enableCDebug = !!flag;
}

export function cdebug(...args) {
  if (enableCDebug) {
    console.log(...args);
  }
}
