import sys, gzip, json

fn = sys.argv[1]
blocknum = int(sys.argv[2])
endblocknum = blocknum
if len(sys.argv) > 3:
    endblocknum = int(sys.argv[3])
yes = False

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        data = json.loads(line.strip())
        type = data["type"]
        if type == "cosmic-swingset-begin-block" and data["blockHeight"] == blocknum:
            yes = True
        if yes:
            sys.stdout.write(line)
        if type == "cosmic-swingset-end-block-finish" and data["blockHeight"] == endblocknum:
            break
