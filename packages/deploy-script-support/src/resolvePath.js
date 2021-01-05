// @ts-check

/** @type {MakeResolvePaths} */
export const makeResolvePaths = (pathResolve, requireResolve) => {
  /** @type {ResolvePathForLocalContract} */
  const resolvePathForLocalContract = contractPath => pathResolve(contractPath);

  /** @type {ResolvePathForPackagedContract} */
  const resolvePathForPackagedContract = contractPath =>
    requireResolve(contractPath);

  return {
    resolvePathForLocalContract,
    resolvePathForPackagedContract,
  };
};
