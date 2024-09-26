#! /usr/bin/env node
/* eslint-env node */
// Get a deployment.json for a 2-node docker setup.

const DEFAULT_NUM_VALIDATORS = 2;
const DEFAULT_NETWORK_NAME = 'localtest';

const NUM_VALIDATORS = process.argv[2] || DEFAULT_NUM_VALIDATORS;

const NETWORK_NAME = process.env.NETWORK_NAME || DEFAULT_NETWORK_NAME;

// Add in DOCKER_VOLUMES=host_path:container_path,host_path2:container_path2,...
const ADD_VOLUMES = (process.env.DOCKER_VOLUMES || '')
  .split(',')
  .flatMap(volumeSpec => {
    const splitVolumeSpec = volumeSpec.split(':');
    if (splitVolumeSpec.length < 2) {
      // No specification found.
      return [];
    }

    const [hostPath, ...rest] = splitVolumeSpec;
    return [
      {
        host_path: hostPath,
        container_path: rest.join(':'),
      },
    ];
  });

const deployment = {
  PLACEMENTS: [
    [
      'docker1',
      {
        default: 2,
      },
    ],
  ],
  PLACEMENT_PROVIDER: {
    docker1: 'docker',
  },
  SSH_PRIVATE_KEY_FILE: 'id_ecdsa',
  DETAILS: {
    VOLUMES: {
      docker1: ADD_VOLUMES,
    },
  },
  OFFSETS: {
    docker1: 0,
  },
  ROLES: {
    docker1: 'validator',
  },
  DATACENTERS: {
    docker1: new Array(NUM_VALIDATORS).fill('default'),
  },
  PROVIDER_NEXT_INDEX: {
    docker: 1,
  },
  NETWORK_NAME,
};

process.stdout.write(`${JSON.stringify(deployment, null, 2)}\n`);
