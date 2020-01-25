const enableKDebug = false;

export default function kdebug(...args) {
  if (enableKDebug) {
    console.log(...args);
  }
}
