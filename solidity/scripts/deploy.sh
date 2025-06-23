#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <network> [contract]"
    echo "Network must be either 'fuji' or 'base'"
    exit 1
fi

network=$1

deploy_contract() {
    local contract_path=$1
    local gateway_contract=$2
    local gas_service_contract=$3
    local aave_contract=$4

    GATEWAY_CONTRACT="$gateway_contract" \
        GAS_SERVICE_CONTRACT="$gas_service_contract" \
        npx hardhat ignition deploy "$contract_path" --network "$network"
}

delete_deployments_folder() {
    local folder=$1
    if [ -d "$folder" ]; then
        echo "Deleting existing deployment folder: $folder"
        rm -rf "$folder"
    else
        echo "No existing deployment folder to delete: $folder"
    fi
}

case $network in
fuji)
    GATEWAY='0xC249632c2D40b9001FE907806902f63038B737Ab'
    GAS_SERVICE='0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6'
    ;;
base)
    GATEWAY='0xe432150cce91c13a887f7D836923d5597adD8E31'
    GAS_SERVICE='0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6'
    ;;
*)
    echo "Invalid network specified"
    exit 1
    ;;
esac

delete_deployments_folder "ignition/deployments"
deploy_contract "./ignition/modules/deployFactory.ts" "$GATEWAY" "$GAS_SERVICE"
