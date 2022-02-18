export default c => {
  // The log array we get from c.dump() is append only, but we only care
  // about the most recent entries.
  let logCount = 0;
  const nextLog = () => {
    const log = c.dump().log;
    const next = log.slice(logCount);
    logCount += next.length;
    return next;
  };
  return nextLog;
};
