// @ts-check
import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';

const trace = makeTracer('StartElys');

/**
 * @param {import('@agoric/vats').AdminVat} vatAdmin
 * @param {import('@agoric/vats').TimerService} timer
 * @param {import('@agoric/vats').NameHub} namesByAddressAdmin
 * @param {import('@agoric/vats').NameHub} agoricNames
 * @param {import('@agoric/vats').NameHub} board
 * @param {object} options
 * @param {string} options.net
 * @param {string} options.feeConfig
 * @param {string} options.allowedChains
 */
export const startElys = async (
  vatAdmin,
  timer,
  namesByAddressAdmin,
  agoricNames,
  board,
  { net, feeConfig, allowedChains },
) => {
  trace('Starting Elys contract deployment');
  
  // Parse fee config
  let parsedFeeConfig;
  try {
    parsedFeeConfig = JSON.parse(feeConfig);
    // Convert string numbers to bigints
    parsedFeeConfig.onBoardRate.nominator = BigInt(parsedFeeConfig.onBoardRate.nominator);
    parsedFeeConfig.onBoardRate.denominator = BigInt(parsedFeeConfig.onBoardRate.denominator);
    parsedFeeConfig.offBoardRate.nominator = BigInt(parsedFeeConfig.offBoardRate.nominator);
    parsedFeeConfig.offBoardRate.denominator = BigInt(parsedFeeConfig.offBoardRate.denominator);
  } catch (e) {
    throw Fail`Invalid fee config: ${e}`;
  }
  
  // Parse allowed chains
  const parsedAllowedChains = allowedChains.split(',');
  if (parsedAllowedChains.length === 0) {
    throw Fail`No allowed chains specified`;
  }
  
  // Get zoe
  const zoe = await E(agoricNames).lookup('zoe');
  
  // Get installation
  const elysInstallation = await E(agoricNames).lookup('installation', 'elys');
  if (!elysInstallation) {
    throw Fail`No elys installation found`;
  }
  
  // Start the contract
  const { creatorFacet, instance, publicFacet } = await E(zoe).startInstance(
    elysInstallation,
    {},
    {
      feeConfig: parsedFeeConfig,
      allowedChains: parsedAllowedChains,
    },
  );
  
  // Save the instance and facets
  await E(agoricNames).update('instance', 'elys', instance);
  await E(agoricNames).update('elys', 'public', publicFacet);
  await E(agoricNames).update('elys', 'creator', creatorFacet);
  
  trace('Elys contract deployed successfully');
  return { instance, publicFacet, creatorFacet };
};

harden(startElys);
