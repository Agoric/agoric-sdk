#!/bin/bash

## see https://github.com/cosmology-tech/starship/blob/7d63c4678a345789d8331dde7654f67953c5cc2b/examples/getting-started/scripts/install.sh

## Script used to install the helm chart for the devnet from a config file
## Usage:
## ./scripts/install.sh --coinfig <config_file>
## Options:
## -c|--config: config file to use (default: config.yaml)
## -v|--version: helm chart version (default: 0.1.43)

set -euo pipefail

# read config file from args into variable
CONFIGFILE="config.yaml"

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
echo "Script dir: ${SCRIPT_DIR}"

# default values
DRY_RUN=""
TIMEOUT=""
NAMESPACE=""
HELM_REPO="starship"
HELM_CHART="starship/devnet"
HELM_REPO_URL="https://cosmology-tech.github.io/starship/"
HELM_CHART_VERSION="0.2.8"
HELM_NAME="agoric-multichain-testing"

# check_helm function verifies the helm binary is installed
function check_helm() {
  if ! command -v helm &> /dev/null; then
    echo "helm could not be found; please install it first!!!"
    exit
  fi
}

# setup_helm function adds the helm repo and updates it
function setup_helm() {
  if [ -d "$HELM_CHART" ]; then
    echo "using local helm chart"
    return
  fi
  helm repo add ${HELM_REPO} ${HELM_REPO_URL}
  helm repo update
  helm search repo ${HELM_CHART} --version ${HELM_CHART_VERSION}
}

function set_helm_args() {
  if [[ $TIMEOUT ]]; then
    args="$args --timeout $TIMEOUT --wait --debug"
  fi
  if [[ $NAMESPACE ]]; then
    args="$args --namespace $NAMESPACE --create-namespace"
  fi
  if [[ $DRY_RUN ]]; then
    args="$args --dry-run --debug"
  fi
  num_chains=$(yq -r ".chains | length - 1" ${CONFIGFILE})
  if [[ $num_chains -lt 0 ]]; then
    echo "No chains to parse: num: $num_chains"
    return 0
  fi
  for i in $(seq 0 $num_chains); do
    scripts=$(yq -r ".chains[$i].scripts" ${CONFIGFILE})
    if [[ "$scripts" == "null" ]]; then
      return 0
    fi
    datadir="$(
      cd "$(dirname -- "${CONFIGFILE}")" > /dev/null
      pwd -P
    )"
    for script in $(yq -r ".chains[$i].scripts | keys | .[]" ${CONFIGFILE}); do
      args="$args --set-file chains[$i].scripts.$script.data=$datadir/$(yq -r ".chains[$i].scripts.$script.file" ${CONFIGFILE})"
    done
  done
}

function install_chart() {
  args=""
  set_helm_args
  echo "name: ${HELM_NAME}, args: $args, chart: ${HELM_CHART}, version: ${HELM_CHART_VERSION}"
  helm install ${HELM_NAME} ${HELM_CHART} --version ${HELM_CHART_VERSION} -f ${CONFIGFILE} $args
}

while [ $# -gt 0 ]; do
  case "$1" in
    -c | --config)
      CONFIGFILE="$2"
      shift 2 # past argument=value
      ;;
    -v | --version)
      HELM_CHART_VERSION="$2"
      shift 2 # past argument
      ;;
    -t | --timeout)
      TIMEOUT="$2"
      shift 2 # past argument
      ;;
    -n | --name)
      HELM_NAME="$2"
      shift 2 # past argument
      ;;
    --namespace)
      NAMESPACE="$2"
      shift 2 # past argument
      ;;
    --chart)
      HELM_CHART="$2"
      shift 2 # past argument
      ;;
    --dry-run)
      DRY_RUN=1
      shift # past argument
      ;;
    -)
      echo "Unknown option $1"
      exit 1
      ;;
    *) ;;

  esac
done

check_helm
setup_helm
install_chart
