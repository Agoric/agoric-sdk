/* eslint-disable @jessie.js/safe-await-separator */
/// <reference types="ses" />
import * as AgoricClientUtils from '@agoric/client-utils';
import { Fail, q } from '@endo/errors';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export type ClusterName = 'local' | 'testnet' | 'mainnet';
export const defaultAgoricNetworkSpecForCluster: Record<ClusterName, string> =
  harden({
    local: AgoricClientUtils.LOCAL_CONFIG_KEY,
    testnet: 'devnet',
    mainnet: 'main',
  });

export interface YmaxPlannerConfig {
  readonly clusterName: ClusterName;
  readonly mnemonic: string;
  readonly alchemyApiKey: string;
  readonly spectrum: {
    readonly apiUrl?: string;
    readonly timeout: number;
    readonly retries: number;
  };
  readonly cosmosRest: {
    readonly agoricNetworkSpec: string;
    readonly agoricNetSubdomain?: string;
    readonly timeout: number;
    readonly retries: number;
  };
}

export type SecretManager = Pick<
  SecretManagerServiceClient,
  'accessSecretVersion'
>;

const getMnemonicFromGCP = async (
  client: SecretManager,
  projectId: string,
  secretName: string,
): Promise<string> => {
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload =
    version.payload?.data?.toString() ||
    Fail`GCP accessSecretVersion response missing payload data`;

  return payload;
};

const parsePositiveInteger = (
  env: Record<string, string | undefined>,
  fieldName: string,
  defaultValue: number,
): number => {
  const value = env[fieldName];
  if (value === undefined) return defaultValue;

  // TODO: Copy `parseNumber` from @endo/cli into @agoric/internal.
  const number = /[0-9]/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(number) || number <= 0) {
    throw Fail`${q(fieldName)} must be a positive integer, got: ${value}`;
  }
  return number;
};

const validateRequired = (
  env: Record<string, string | undefined>,
  fieldName: string,
): string => {
  const value = env[fieldName]?.trim();
  return value || Fail`${q(fieldName)} is required`;
};

const validateUrl = (
  env: Record<string, string | undefined>,
  fieldName: string,
  defaultValue: string | undefined,
): string | undefined => {
  const value = env[fieldName]?.trim();
  if (!value) return defaultValue;

  try {
    void new URL(value);
    return value;
  } catch {
    throw Fail`${q(fieldName)} must be a valid URL, got: ${value}`;
  }
};

export const loadConfig = async (
  env: Record<string, string | undefined>,
  secretManager: SecretManager = new SecretManagerServiceClient(),
): Promise<YmaxPlannerConfig> => {
  // CLUSTER and AGORIC_NET can each be derived from the other (e.g., CLUSTER
  // "testnet" implies default AGORIC_NET "devnet", and an AGORIC_NET
  // subdomain other than "local" or "main" implies default CLUSTER "testnet".
  let clusterName = env.CLUSTER as ClusterName;
  !clusterName ||
    Object.hasOwn(defaultAgoricNetworkSpecForCluster, clusterName) ||
    Fail`CLUSTER must be one of ${q(Object.keys(defaultAgoricNetworkSpecForCluster))}`;
  const agoricNetworkSpec =
    env.AGORIC_NET?.trim() ||
    defaultAgoricNetworkSpecForCluster[clusterName || 'local'] ||
    Fail`Could not default AGORIC_NET`;
  const { subdomain: agoricNetSubdomain } =
    AgoricClientUtils.parseNetworkSpec(agoricNetworkSpec);
  if (agoricNetSubdomain === AgoricClientUtils.LOCAL_CONFIG_KEY) {
    clusterName ||= 'local';
  } else if (agoricNetSubdomain === 'main') {
    clusterName ||= 'mainnet';
  } else {
    clusterName ||= 'testnet';
  }

  const gcpProjectId = env.GCP_PROJECT_ID?.trim() || 'simulationlab';
  const gcpSecretName = env.GCP_SECRET_NAME?.trim() || 'YMAX_CONTROL_MNEMONIC';
  const mnemonic =
    env.MNEMONIC?.trim() ||
    (await getMnemonicFromGCP(secretManager, gcpProjectId, gcpSecretName)) ||
    Fail`Mnemonic is required`;

  const config: YmaxPlannerConfig = harden({
    clusterName,
    mnemonic,
    alchemyApiKey: validateRequired(env, 'ALCHEMY_API_KEY'),
    spectrum: {
      apiUrl: validateUrl(env, 'SPECTRUM_API_URL', undefined),
      timeout: parsePositiveInteger(env, 'SPECTRUM_API_TIMEOUT', 30000),
      retries: parsePositiveInteger(env, 'SPECTRUM_API_RETRIES', 3),
    },
    cosmosRest: {
      agoricNetworkSpec,
      agoricNetSubdomain,
      timeout: parsePositiveInteger(env, 'COSMOS_REST_TIMEOUT', 15000),
      retries: parsePositiveInteger(env, 'COSMOS_REST_RETRIES', 3),
    },
  });

  return config;
};
