import sys, gzip, json, os
from unmarshal import unmarshal

# Given a slogfile argument, find all non-empty blocks and write each to
# a bNNN-$flags.slog file in the current directory (where $flags
# indicate interesting aspects such as
# "bank"/"timer"/"publicInvitationMaker"/etc.).

fn = sys.argv[1]
blocknum = None
capture = False
early_lines = []
emit_f = None
why = []

opener = gzip.open if fn.endswith(".gz") else open
opener = (lambda _: sys.stdin) if fn == "-" else opener
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        data = json.loads(line.strip())
        type = data["type"]
        if type == "cosmic-swingset-begin-block":
            blocknum = data["blockHeight"]
            early_lines = []
            capture = True
            assert emit_f is None
            why.clear()
        if type == "cosmic-swingset-bridge-inbound":
            why.append(data["source"]) # bank, provision, wallet
        if emit_f:
            emit_f.write(line)
        if capture:
            early_lines.append(line)
            if type == "crank-start":
                name = "b{}.slog".format(blocknum)
                print("open {}".format(name));
                emit_f = open(name, "w")
                for l in early_lines: # retroactively interesting
                    emit_f.write(l)
                early_lines.clear()
                capture = False
        if type == "crank-start" and data["crankType"] == "routing" and data["message"]["type"] == "send":
            if data["message"]["target"] == "ko296":
                why.append("timer")
            if data["message"]["target"] == "ko62":
                d1 = unmarshal(data["message"]["msg"]["methargs"]["body"])
                if d1[0] == "inbound" and d1[1][0] == "wallet":
                    print("d1", d1)
                    d2 = unmarshal(json.loads(d1[1][1]["spendAction"])["body"])
                    print("d2", d2)
                    if d2["method"] == "executeOffer":
                        spec = d2["offer"]["invitationSpec"]
                        if "instance" in spec:
                            if "publicInvitationMaker" in spec:
                                why.append(spec["publicInvitationMaker"])
                                # "makeWantMintedInvitation": PSM trade (buy IST)
                                # "makeGiveMintedInvitation": PSM trade (sell IST)
                            else:
                                why.append("offer.instance")
                        elif "callPipe" in spec:
                            why.append("callPipe")
                        elif "invitationMakerName" in spec:
                            why.append(spec["invitationMakerName"])
                        else:
                            why.append("unknown.offer")
        if len(early_lines) > 20:
            capture = False # the current block is probably not interesting, give up
        if type == "cosmic-swingset-end-block-finish":
            capture = False
            if emit_f:
                print("close")
                emit_f.close()
                emit_f = None
                os.rename(name, "b{}-{}.slog".format(blocknum, "-".join(why)))
