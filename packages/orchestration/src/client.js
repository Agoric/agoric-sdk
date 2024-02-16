import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';

export const getOrchestratorClient = (
  getClientOptions,
  defaultTypes = defaultRegistryTypes,
) => {
  const opts = getClientOptions(defaultTypes);

  const signer = {
    async sign() {
      throw new Error('No signer provided');
    },
  };

  const client = new SigningStargateClient(cometAdapter, signer, opts);
  return client;
};
