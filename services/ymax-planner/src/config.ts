/* eslint-disable @jessie.js/safe-await-separator */
/// <reference types="ses" />
import { Fail } from '@endo/errors';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const GCP_PROJECT_ID = 'simulationlab';
const GCP_SECRET_NAME = 'YMAX_CONTROL_MNEMONIC';

export interface YmaxPlannerConfig {
  readonly mnemonic: string;
  readonly alchemy: string;
  readonly spectrum: {
    readonly apiUrl?: string;
    readonly timeout: number;
    readonly retries: number;
  };
  readonly cosmosRest: {
    readonly agoricNetwork: string;
    readonly timeout: number;
    readonly retries: number;
  };
}

export type SecretManager = Pick<
  SecretManagerServiceClient,
  'accessSecretVersion'
>;

const getMnemonicFromGCP = async (client: SecretManager): Promise<string> => {
  const name = `projects/${GCP_PROJECT_ID}/secrets/${GCP_SECRET_NAME}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();

  if (!payload) {
    throw new Error('Missing secret payload');
  }

  return payload;
};

const parsePositiveInteger = (
  env: Record<string, string | undefined>,
  defaultValue: number,
  fieldName: string,
): number => {
  const value = env[fieldName];
  if (value === undefined) return defaultValue;

  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Fail`${fieldName} must be a positive integer, got: ${value}`;
  }
  return parsed;
};

const validateRequired = (
  env: Record<string, string | undefined>,
  fieldName: string,
): string => {
  const value = env[fieldName];
  if (!value || value.trim() === '') {
    throw Fail`${fieldName} is required but not provided`;
  }
  return value.trim();
};

const validateOptionalUrl = (
  env: Record<string, string | undefined>,
  fieldName: string,
): string | undefined => {
  const value = env[fieldName];
  if (!value || value.trim() === '') return undefined;

  const trimmed = value.trim();
  try {
    void new URL(trimmed);
    return trimmed;
  } catch {
    throw Fail`${fieldName} must be a valid URL, got: ${value}`;
  }
};

export const loadConfig = async (
  env: Record<string, string | undefined>,
  secretManager: SecretManager,
): Promise<YmaxPlannerConfig> => {
  try {
    const mnemonic = env.MNEMONIC
      ? env.MNEMONIC.trim()
      : await getMnemonicFromGCP(secretManager);
    if (!mnemonic) {
      throw new Error('Mnemonic is required but not provided');
    }

    const config: YmaxPlannerConfig = harden({
      mnemonic,
      alchemy: validateRequired(env, 'ALCHEMY_API_KEY'),
      spectrum: {
        apiUrl: validateOptionalUrl(env, 'SPECTRUM_API_URL'),
        timeout: parsePositiveInteger(env, 30000, 'SPECTRUM_API_TIMEOUT'),
        retries: parsePositiveInteger(env, 3, 'SPECTRUM_API_RETRIES'),
      },
      cosmosRest: {
        agoricNetwork: env.AGORIC_NET?.trim() || 'local',
        timeout: parsePositiveInteger(env, 15000, 'COSMOS_REST_TIMEOUT'),
        retries: parsePositiveInteger(env, 3, 'COSMOS_REST_RETRIES'),
      },
    });

    return config;
  } catch (error) {
    throw Error(`Configuration validation failed: ${error.message}`);
  }
};

export const getConfig = (() => {
  let cachedConfig: YmaxPlannerConfig | undefined;

  return async (
    env: Record<string, string | undefined> = process.env,
    powers: { secretManager?: SecretManager } = {},
  ): Promise<YmaxPlannerConfig> => {
    if (!cachedConfig) {
      const secretManager =
        powers.secretManager || new SecretManagerServiceClient();
      cachedConfig = await loadConfig(env, secretManager);
    }
    return cachedConfig;
  };
})();
