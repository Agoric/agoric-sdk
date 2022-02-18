let enableCDebug = false;

export const cdebugEnable = flag => {
  enableCDebug = !!flag;
};

export const cdebug = (...args) => {
  if (enableCDebug) {
    console.log(...args);
  }
};
