import json, hashlib, base64

# cat ~/.ag-chain-cosmos/config/genesis.json |jq -c '.app_state | .genutil.gen_txs | map(.body.messages[0]) | map([.description.moniker, .pubkey.key])' > keys.txt

with open("keys.txt") as f:
    keys = json.load(f)
for (moniker, key_b64) in keys:
    hexaddr = hashlib.sha256(base64.b64decode(key_b64)).hexdigest()[:40].upper()
    # hexaddr appears in `query block` | jq .block_header.proposer_address
    print(hexaddr, moniker)

    
