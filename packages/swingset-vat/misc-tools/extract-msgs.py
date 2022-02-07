import sys, json, base64

# ag-chain-cosmos query block NNNN | extract-msgs.py

MAGIC = b"agoric.swingset.MsgDeliverInbound"

data = json.loads(sys.stdin.read())
for s in data["block"]["data"]["txs"] or []:
    raw = base64.b64decode(s) # amino-encoded signed txn
    if MAGIC in raw:
        # I have no idea how to decode this without Golang, this is a horrible hack
        end = raw.index(MAGIC) + len(MAGIC)
        end += raw[end:].index(b'\n') - 2
        print(raw[end:])
        print()
        

