#!/bin/bash

source ./utils.sh

alias nobled=../build/nobled

HOME1=.duke

for arg in "$@"
do
    case $arg in
        -r|--reset)
        rm -rf $HOME1
        shift
        ;;
    esac
done



if ! [ -f $HOME1/data/priv_validator_state.json ]; then
  nobled init validator --chain-id "duke-1" --home $HOME1 &> /dev/null

  nobled keys add validator --home $HOME1 --keyring-backend test &> /dev/null
  nobled genesis add-genesis-account validator 1000000ustake --home $HOME1 --keyring-backend test
  AUTHORITY=$(nobled keys add authority --home $HOME1 --keyring-backend test --output json | jq .address)
  nobled genesis add-genesis-account authority 4000000ustake --home $HOME1 --keyring-backend test
  nobled genesis add-genesis-account noble1cyyzpxplxdzkeea7kwsydadg87357qnah9s9cv 1000000uusdc --home $HOME1 --keyring-backend test

  update_genesis $HOME1 $AUTHORITY

  nobled genesis gentx validator 1000000ustake --chain-id "duke-1" --home $HOME1 --keyring-backend test &> /dev/null
  nobled genesis collect-gentxs --home $HOME1 &> /dev/null
fi

nobled start --home $HOME1
