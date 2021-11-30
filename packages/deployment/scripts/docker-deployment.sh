#! /bin/bash
# Get a deployment.json for a 2-node docker setup.
set -e

NETWORK_NAME=${NETWORK_NAME-localtest}
export NETWORK_NAME

# Add in DOCKER_VOLUMES=host_path:container_path,host_path2:container_path2,...
ADD_VOLUMES=
save_IFS=${IFS-$(echo -e '\n\t ')}
IFS=,; set $DOCKER_VOLUMES
for hostcontainer in $@; do
  IFS=: read -r hostpath containerpath <<< "$hostcontainer"
  ADD_VOLUMES="$ADD_VOLUMES, { \"host_path\": \"$hostpath\", \"container_path\": \"$containerpath\" }"
done
IFS=${save_IFS}

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
        }$ADD_VOLUMES
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
