#! /bin/bash
set -e

thisdir=$(dirname -- "$0")
FAUCET_HOME=$thisdir/../faucet
DELEGATES="$thisdir/cosmos-delegates.txt"

MAX_LINES=-1
STAKE=75000000ubld
# GIFT=251000000000urun
GIFT=100000000urun
# SOLO_COINS=100000000urun
# SOLO_COINS=220000000000urun,75000000ubld


OP=$1
shift

ACH="agd --home=$FAUCET_HOME --log_level=info"
FAUCET_ADDR=$($ACH keys show --keyring-backend=test -a faucet)

case $OP in
show-faucet-address)
  echo "$FAUCET_ADDR"
  exit 0
  ;;
esac

chainName=$(cat "$thisdir/ag-chain-cosmos/chain-name.txt")
IFS=, read -r -a origRpcAddrs <<<"$(AG_SETUP_COSMOS_HOME=$thisdir ag-setup-cosmos show-rpcaddrs)"

rpcAddrs=(${origRpcAddrs[@]})
while [[ ${#rpcAddrs[@]} -gt 0 ]]; do
  r=$(( RANDOM % ${#rpcAddrs[@]} ))
  selected=${rpcAddrs[$r]}
  rpcAddrs=( ${rpcAddrs[@]/$selected} )

  # echo "Checking if $selected is alive"
  if [[ $(curl -s http://"$selected"/status | jq .result.sync_info.catching_up) == false ]]; then
    QUERY="$ACH query --node=tcp://$selected"
    TX="$ACH tx --node=tcp://$selected --chain-id=$chainName --keyring-backend=test --yes --gas=auto --gas-adjustment=1.2 --broadcast-mode=sync --from=$FAUCET_ADDR"
    case $OP in
    debug)
      echo "would try $selected"
      ;;
    add-egress)
      NAME=$1
      ADDR=$2
      if out=$($QUERY swingset egress -- "$ADDR" 2>&1); then
        echo "$NAME has already tapped the faucet: $ADDR" 1>&2
        echo "$out"
        exit 1
      fi
      if echo "$out" | grep -q 'egress not found'; then :
      else
        echo "$out" 1>&2
        exit 2
      fi
      # Send the message in a single transaction.
      body0=$($TX swingset provision-one --generate-only --gas=600000 -- "$NAME" "$ADDR")
      if test -n "$SOLO_COINS"; then
        msg1=$($TX bank send --generate-only --gas=600000 -- "$FAUCET_ADDR" "$ADDR" "$SOLO_COINS" | jq .body.messages)
      else
        msg1='[]'
      fi
      txfile="/tmp/faucet.$$.json"
      trap 'rm -f "$txfile"' EXIT
      echo "$body0" | jq ".body.messages += $msg1" > "$txfile"
      $TX sign "$txfile" | $TX broadcast --broadcast-mode=block - | tee /dev/stderr | grep -q '^code: 0'
      exit $? 
      ;;
    gift)
      ADDR=$1
      if $QUERY bank balances -- "$ADDR" | grep urun; then
        exit 0
      fi
      echo sending "$GIFT" to "$ADDR"
      exec "$TX" \
        bank send \
        --broadcast-mode=block \
        -- faucet "$ADDR" "$GIFT"
      ;;
    add-delegate)
      UNIQUE=yes
      case "$1" in
      --force | -f) UNIQUE=no; shift ;;
      esac
      NAME=$1
      ADDR=$2

      if [[ $UNIQUE != no && $MAX_LINES -ge 0 && $(wc -l "$DELEGATES" | sed -e 's/ .*//') -ge $MAX_LINES ]]; then
        echo "Sorry, we've capped the number of validators at $MAX_LINES"
        exit 1
      fi
      if [[ $UNIQUE != no ]]; then
        line=$(grep -e ":$NAME$" "$DELEGATES" || true)
        if [[ -n $line ]]; then
          echo "$NAME has already tapped the faucet:" 1>&2
          echo "$line" 1>&2
          exit 1
        fi
      fi
      if [[ $UNIQUE != no ]]; then
        line=$(grep -e "^$ADDR:" "$DELEGATES" || true)
        if [[ -n $line ]]; then
          echo "$ADDR already received a tap:" 1>&2
          echo "$line" 1>&2
          exit 1
        fi
      fi

      if $TX \
        bank send \
        --broadcast-mode=block \
        -- faucet "$ADDR" "$STAKE"; then
        # Record the information before exiting, if the file exists.
        test -f "$DELEGATES" || exit 0
        sed -i -e "/:$NAME$/d" "$DELEGATES"
        echo "$ADDR:$STAKE:$NAME" >> "$DELEGATES"
        exit 0
      fi
      ;;
    *)
      echo 1>&2 "Unknown operation $OP"
      exit 1
      ;;
    esac
  fi
done

echo 1>&2 "No active chain nodes found in: ${origRpcAddrs[*]}"
exit 1
