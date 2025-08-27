/// <reference types="ses" />
import { Fail } from '@endo/errors';

export interface YmaxPlannerConfig {
  readonly mnemonic: string;
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

const parsePositiveInteger = (
  value: string | undefined,
  defaultValue: number,
  fieldName: string,
): number => {
  if (value === undefined) return defaultValue;

  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Fail`${fieldName} must be a positive integer, got: ${value}`;
  }
  return parsed;
};

const validateRequired = (
  value: string | undefined,
  fieldName: string,
): string => {
  if (!value || value.trim() === '') {
    throw Fail`${fieldName} is required but not provided`;
  }
  return value.trim();
};

const validateOptionalUrl = (
  value: string | undefined,
  fieldName: string,
): string | undefined => {
  if (!value || value.trim() === '') return undefined;

  const trimmed = value.trim();
  try {
    void new URL(trimmed);
    return trimmed;
  } catch {
    throw Fail`${fieldName} must be a valid URL, got: ${value}`;
  }
};

export const loadConfig = (
  env: Record<string, string | undefined>,
): YmaxPlannerConfig => {
  try {
    const config: YmaxPlannerConfig = harden({
      mnemonic: validateRequired(env.MNEMONIC, 'MNEMONIC'),
      spectrum: {
        apiUrl: validateOptionalUrl(env.SPECTRUM_API_URL, 'SPECTRUM_API_URL'),
        timeout: parsePositiveInteger(
          env.SPECTRUM_API_TIMEOUT,
          30000,
          'SPECTRUM_API_TIMEOUT',
        ),
        retries: parsePositiveInteger(
          env.SPECTRUM_API_RETRIES,
          3,
          'SPECTRUM_API_RETRIES',
        ),
      },
      cosmosRest: {
        agoricNetwork: env.AGORIC_NET?.trim() || 'local',
        timeout: parsePositiveInteger(
          env.COSMOS_REST_TIMEOUT,
          15000,
          'COSMOS_REST_TIMEOUT',
        ),
        retries: parsePositiveInteger(
          env.COSMOS_REST_RETRIES,
          3,
          'COSMOS_REST_RETRIES',
        ),
      },
    });

    return config;
  } catch (error) {
    throw Error(`Configuration validation failed: ${error.message}`);
  }
};

export const getConfig = (() => {
  let cachedConfig: YmaxPlannerConfig | undefined;

  return (env?: Record<string, string | undefined>): YmaxPlannerConfig => {
    if (!cachedConfig) {
      cachedConfig = loadConfig(env || process.env);
    }
    return cachedConfig;
  };
})();
