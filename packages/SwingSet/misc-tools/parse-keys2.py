import sys, json, hashlib, base64, yaml, subprocess

monikers = {}
def load_genesis_keys(fn):
    with open("keys.txt") as f:
        keys = json.load(f)
    for (moniker, key_b64) in keys:
        hexaddr = hashlib.sha256(base64.b64decode(key_b64)).hexdigest()[:40].upper()
        # hexaddr appears in `query block` | jq .block_header.proposer_address
        monikers[hexaddr] = moniker
load_genesis_keys("/home/warner/.ag-chain-cosmos/config/genesis.json")

cmd = ["agd", "query", "tendermint-validator-set"]
if len(sys.argv) > 1:
    block = int(sys.argv[1])
    cmd.append(str(block))

out = subprocess.check_output(cmd).decode()
d = yaml.safe_load(out)
print(d.keys())
validators = []
for validator in d["validators"]:
    # this query tells us the validator address (agoricvalcons...), their pubkey, voting power,
    # and "proposer_priority" (which changes on each block, implementing the round-robin), but
    # not their moniker
    address = validator["address"]
    assert validator["pub_key"]["type"] == "tendermint/PubKeyEd25519"
    key_b64 = validator["pub_key"]["value"]
    hexaddr = hashlib.sha256(base64.b64decode(key_b64)).hexdigest()[:40].upper()
    # hexaddr appears in `query block` | jq .block_header.proposer_address
    validators.append((int(validator["proposer_priority"]), monikers.get(hexaddr, "?"), hexaddr))

validators.sort()
for (pri, mon, adr) in validators:
    print("%7d %30s   %s" % (pri, mon, adr))

