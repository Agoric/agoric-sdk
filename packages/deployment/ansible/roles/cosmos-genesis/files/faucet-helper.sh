#! /bin/bash
set -e

thisdir=$(dirname -- "$0")
FAUCET_HOME=$thisdir/../faucet

MAX_LINES=-1
DELEGATE_COINS=62000000ubld,9300000urun
SOLO_COINS=5000000urun

OP=$1
shift

case $OP in
show-faucet-address)
  exec ag-cosmos-helper --home=$FAUCET_HOME \
    keys show -a \
    --keyring-backend=test \
    -- faucet
  exit $?
  ;;
esac

chainName=$(cat "$thisdir/ag-chain-cosmos/chain-name.txt")
IFS=, read -r -a origRpcAddrs <<<"$(AG_SETUP_COSMOS_HOME=$thisdir ag-setup-cosmos show-rpcaddrs)"

rpcAddrs=(${origRpcAddrs[@]})
while [[ ${#rpcAddrs[@]} -gt 0 ]]; do
  r=$(( $RANDOM % ${#rpcAddrs[@]} ))
  selected=${rpcAddrs[$r]}
  rpcAddrs=( ${rpcAddrs[@]/$selected} )

  # echo "Checking if $selected is alive"
  if [[ $(curl -s http://$selected/status | jq .result.sync_info.catching_up) == false ]]; then
    case $OP in
    debug)
      echo "would try $selected"
      ;;
    add-egress)
      NAME=$1
      ADDR=$2
      if ag-cosmos-helper query swingset egress "$ADDR" --chain-id=$chainName; then
        # Already provisioned.
        exit 1
      fi
      ag-cosmos-helper --home=$FAUCET_HOME \
        tx swingset provision-one \
        --node=tcp://$selected --chain-id=$chainName --keyring-backend=test \
        --yes --broadcast-mode=block \
        --from=faucet -- "$NAME" "$ADDR"
      exec ag-cosmos-helper --home=$FAUCET_HOME \
        tx bank send \
        --node=tcp://$selected --chain-id=$chainName --keyring-backend=test \
        --yes --gas=auto --gas-adjustment=1.2 --broadcast-mode=block \
        -- faucet "$ADDR" "$SOLO_COINS"
      ;;
    add-delegate)
      UNIQUE=yes
      case "$1" in
      --force | -f) UNIQUE=no; shift ;;
      esac
      NAME=$1
      ADDR=$2

      if [[ $UNIQUE != no && $MAX_LINES -ge 0 && $(wc -l $thisdir/cosmos-delegates.txt | sed -e 's/ .*//') -ge $MAX_LINES ]]; then
        echo "Sorry, we've capped the number of validators at $MAX_LINES"
        exit 1
      fi
      if [[ $UNIQUE != no ]]; then
        line=$(grep -e ":$NAME$" $thisdir/cosmos-delegates.txt || true)
        if [[ -n $line ]]; then
          echo "$NAME has already tapped the faucet:" 1>&2
          echo "$line" 1>&2
          exit 1
        fi
      fi
      if [[ $UNIQUE != no ]]; then
        line=$(grep -e "^$ADDR:" $thisdir/cosmos-delegates.txt || true)
        if [[ -n $line ]]; then
          echo "$ADDR already received a tap:" 1>&2
          echo "$line" 1>&2
          exit 1
        fi
      fi

      if ag-cosmos-helper --home=$FAUCET_HOME \
        tx bank send \
        --node=tcp://$selected --chain-id=$chainName --keyring-backend=test \
        --yes --gas=auto --gas-adjustment=1.2 --broadcast-mode=block \
        -- faucet "$ADDR" "$DELEGATE_COINS"; then
        # Record the information before exiting.
        sed -i -e "/:$NAME$/d" $thisdir/cosmos-delegates.txt
        echo "$ADDR:$DELEGATE_COINS:$NAME" >> $thisdir/cosmos-delegates.txt
        exit 0
      fi
      exit $?
      ;;
    *)
      echo 1>&2 "Unknown operation $OP"
      exit 1
      ;;
    esac
  fi
done

echo 1>&2 "No active chain nodes found in: ${origRpcAddrs[@]}"
exit 1
