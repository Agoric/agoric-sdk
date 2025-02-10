/**
 * To customize proposals for multiple environments, we pass the "variant"
 * identifier in scriptArgs. The variant must match a knownVariant.
 *
 * @param {import('./externalTypes.js').DeployScriptEndownments} endowments
 * @param {string} name a name to use in error messages or Usage suggestions.
 * @param {string[]} knownVariants
 */
export const parseScriptArgs = async (endowments, name, knownVariants) => {
  const { scriptArgs } = endowments;
  // const variantOrConfig = scriptArgs?.[0];
  const variantOrConfig =
    scriptArgs && scriptArgs.length > 0 ? scriptArgs : undefined;

  console.log(`${name}`, variantOrConfig);

  const Usage = `agoric run ${name}.js ${[...knownVariants, '<json-config>'].join(' | ')}`;
  const opts = {};

  if (typeof variantOrConfig === 'string') {
    if (variantOrConfig[0] === '{') {
      try {
        opts.config = JSON.parse(variantOrConfig);
      } catch (err) {
        throw Error(`Failed to parse config argument ${variantOrConfig}`);
      }
    } else {
      opts.variant = variantOrConfig;
    }
  } else {
    console.error(Usage);
    throw Error(Usage);
  }

  return opts;
};
