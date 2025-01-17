import sys, gzip, json

fn = sys.argv[1]
yes = False

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        data = json.loads(line.strip())
        type = data["type"]
        if type == "cosmic-swingset-bootstrap-block-start":
            yes = True
        if yes:
            sys.stdout.write(line)
        if type == "cosmic-swingset-bootstrap-block-finish":
            break
