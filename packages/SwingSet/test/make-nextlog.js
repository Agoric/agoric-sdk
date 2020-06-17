export default function makeNextLog(c) {
  // The log array we get from c.dump() is append only, but we only care
  // about the most recent entries.
  let logCount = 0;
  function nextLog() {
    const log = c.dump().log;
    const next = log.slice(logCount);
    logCount += next.length;
    return next;
  }
  return nextLog;
}
