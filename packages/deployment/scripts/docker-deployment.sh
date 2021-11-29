#! /bin/bash
# Get a deployment.json for a 2-node docker setup.
set -e

NETWORK_NAME=${NETWORK_NAME-localtest}
export NETWORK_NAME

cat <<EOF
{
  "PLACEMENTS": [
    [
      "docker1",
      {
        "default": 2
      }
    ]
  ],
  "PLACEMENT_PROVIDER": {
    "docker1": "docker"
  },
  "SSH_PRIVATE_KEY_FILE": "id_ecdsa",
  "DETAILS": {
    "VOLUMES": {
      "docker1": [
        {
          "host_path": "/sys/fs/cgroup",
          "container_path": "/sys/fs/cgroup"
        }
      ]
    }
  },
  "OFFSETS": {
    "docker1": 0
  },
  "ROLES": {
    "docker1": "validator"
  },
  "DATACENTERS": {
    "docker1": [
      "default",
      "default"
    ]
  },
  "PROVIDER_NEXT_INDEX": {
    "docker": 1
  },
  "NETWORK_NAME": "$NETWORK_NAME"
}
EOF
