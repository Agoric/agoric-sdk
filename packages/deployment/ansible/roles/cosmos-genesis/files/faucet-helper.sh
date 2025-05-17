#! /bin/bash
set -e

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

FAUCET_HOME=$thisdir/../faucet
DELEGATES="$thisdir/cosmos-delegates.txt"

MAX_LINES=-1
STAKE=75000000ubld
# GIFT=251000000000uist
GIFT=100000000uist
# Use the env value if already set, e.g. by the deployment integration test
SOLO_COINS=${SOLO_COINS-100000000uist}
# SOLO_COINS=220000000000uist,75000000ubld

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

networkName=$(basename "$thisdir")
if netconfig=$(curl -s "https://$networkName.agoric.net/network-config"); then
  chainName=$(echo "$netconfig" | jq -r .chainName)
  read -r -a origRpcAddrs <<< "$(echo "$netconfig" | jq -r .rpcAddrs[])"
else
  chainName=$(cat "$thisdir/ag-chain-cosmos/chain-name.txt")
  IFS=, read -r -a origRpcAddrs <<< "$(AG_SETUP_COSMOS_HOME=$thisdir ag-setup-cosmos show-rpcaddrs)"
fi

read -ra rpcAddrs <<< "${origRpcAddrs[@]}"
while [[ ${#rpcAddrs[@]} -gt 0 ]]; do
  r=$((RANDOM % ${#rpcAddrs[@]}))
  selected=${rpcAddrs[$r]}
  read -ra rpcAddrs <<< "${rpcAddrs[@]/$selected/}"

  case $selected in
    *://*)
      node="$selected"
      status="$selected/status"
      ;;
    *)
      node="tcp://$selected"
      status="http://$selected/status"
      ;;
  esac

  # echo "Checking if $selected is alive"
  if [[ $(curl -s "$status" | jq .result.sync_info.catching_up) == false ]]; then
    QUERY="$ACH query --node=$node"
    TX="$ACH tx --node=$node --chain-id=$chainName --keyring-backend=test --yes --gas=auto --gas-adjustment=1.2 --broadcast-mode=sync --from=$FAUCET_ADDR"
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
        if echo "$out" | grep -q 'egress not found'; then
          :
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
        signedtxfile="/tmp/faucet.$$.signed.json"
        trap 'rm -f "$txfile" "$signedtxfile"' EXIT
        echo "$body0" | jq ".body.messages += $msg1" > "$txfile"
        if $TX sign "$txfile" | tee "$signedtxfile" | $TX broadcast --broadcast-mode=block - | tee /dev/stderr | grep -q '^code: 0'; then
          status=0
        else
          status=$?
          printf 'tx broadcast failure!\n''unsigned payload: %s\n''signed payload: %s\n' "$(cat "$txfile")" "$(cat "$signedtxfile")" 1>&2
        fi
        exit $status
        ;;
      gift)
        ADDR=$1
        echo sending "$GIFT" to "$ADDR"
        $TX \
          bank send \
          --broadcast-mode=block \
          -- faucet "$ADDR" "$GIFT"
        exit $?
        ;;
      add-delegate)
        UNIQUE=yes
        case "$1" in
          --force | -f)
            UNIQUE=no
            shift
            ;;
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
