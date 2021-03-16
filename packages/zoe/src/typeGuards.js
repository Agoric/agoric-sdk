// @ts-check

/**
 * @param {ExitRule} exit
 * @returns {exit is OnDemandExitRule}
 */
export const isOnDemandExitRule = exit => {
  const [exitKey] = Object.getOwnPropertyNames(exit);
  return exitKey === 'onDemand';
};

/**
 * @param {ExitRule} exit
 * @returns {exit is WaivedExitRule}
 */
export const isWaivedExitRule = exit => {
  const [exitKey] = Object.getOwnPropertyNames(exit);
  return exitKey === 'waived';
};

/**
 * @param {ExitRule} exit
 * @returns {exit is AfterDeadlineExitRule}
 */
export const isAfterDeadlineExitRule = exit => {
  const [exitKey] = Object.getOwnPropertyNames(exit);
  return exitKey === 'afterDeadline';
};
