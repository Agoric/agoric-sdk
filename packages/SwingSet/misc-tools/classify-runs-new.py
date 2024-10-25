import sys, json

from classify import classify

# * runs-continued.jsonlines : JSON of:
#   { classification, runids: [runids..],
#     normal: { deliveries, computrons, elapsed, vatIDs: set },
#     GC: { deliveries, computrons, elapsed, vatIDs: set },
#     BOYD: { deliveries, computrons, elapsed, vatIDs: list },
#     snapshot: { saves, loads, elapsed, vatIDs: list },
#             elapsed includes worker-start and snapshot load, plus rollover time
#     replay: { deliveries, computrons, elapsed, vatIDs: list },
#             elapsed excludes worker-start and snapshot load
#     interDelivery: { elapsed }, // deliver-result to deliver, but not between continued runs
#     total: { deliveries, computrons, elapsed },
#   }

# the overall cycle looks like:
# * cosmic-swingset-begin-block
# * cosmic-swingset-end-block-start
# * one or more of:
#   * [cosmic-swingset-bridge-inbound]
#   * cosmic-swingset-run-start
#   * .. crank-start/finish, deliver/result, syscall/result
#   * cosmic-swingset-run-finish
# * cosmic-swingset-end-block-finish
# * cosmic-swingset-commit-block-start
# * cosmic-swingset-commit-block-finish
# * cosmic-swingset-after-commit-stats
#
# we classify each run by looking at any bridge-inbound or at the first
# delivery, with additional details from later deliveries, and save all the
# slog lines from cosmic-swingset-bridge-inbound to cosmic-swingset-run-finish
# in a single file, named bNNN-rNN-TYPE.slog


# input is decompressed slog on stdin

# filter-slog.py cosmic-swingset- deliver heap-snapshot- vat-startup- =start-replay =finish-replay =create-vat

def parse_and_filter(iter_lines):
    for line in iter_lines:
        d = json.loads(line)
        type = d["type"]
        if type in ["clist", "crank-start", "crank-finish", "syscall", "syscall-result", "console"]:
            continue
        yield d

GC_ACTIONS = { "dropExports", "retireExports", "retireImports" }

# preload sees:
#  kernel-init-start
#   create-vat
#   vat-startup-start
#   heap-snapshot-load
#   vat-startup-finish
#   start-replay
#    .. (deliveries)
#   finish-replay
#   .. (for all preloaded vats, typically v1-v26)
#  kernel-init-finish

# new vat creation (e.g. run-57 v168) sees:
#  create-vat
#  vat-startup-start
#  vat-startup-finish (300ms)
#  start-replay ("deliveries:1", not sure why)
#  finish-replay (no deliveries)
#  deliver {kd:[startVat,vatParams]}
#  deliver-result
#

# the vat upgrade cycle (for paged-out vat) sees:
#  crank-start {crankType:delivery, message: { type: 'upgrade-vat', vatID, upgradeID }}
#  create-vat { vatID }
#  heap-snapshot-load
#  start-replay
#   .. (deliveries, replay:true)
#  finish-replay
#   .. # BOYD delivery
#  (transcript replaced with single init-vat)
#  start-replay
#  finish-replay (no deliveries, two missing deliveryNums)
#   .. # startVat delivery

# the page-in cycle sees:
# crank-start {crankType:delivery, message:{whatever}
#  11ms
# create-vat
#  61ms
# heap-snapshot-load
#  331ms
# start-replay
#  .. (deliveries, replay:true)
# finish-replay
# deliver (replay:false, whatever)

# span rollover sees:
#  deliver-result 59.5719
#  heap-snapshot-load 60.8185
#  heap-snapshot-save 60.8522
#  crank-finish 60.8526

# snapshots: we're either paging in a vat for the first time this
# process, or doing a snapshot save/reload cycle.
#
# save/reload cycle sees:
#  deliver-result time=A
#  heap-snapshot-load time=B
#  heap-snapshot-save time=C dbSaveSeconds, compressSeconds
#
# B-A is significant, C-B is tiny. The timestamps are weird because we
# stream the snapshot from the worker, tee it into a new worker and the
# hasher and the compressor, and can't write either the -load or the
# -save event until after the sequence is complete.
#
# we start by telling the old worker to start streaming out its
# snapshot.  then we create two tasks in parallel: starting the new
# worker (consuming the stream), and compressing/saving the
# snapshot. The compress/save records the compression time, and then
# the save-to-DB time. The heap-snapshot-load event is not written (by
# the manager) until after both tasks are complete, and the -save event
# is written (by vatKeeper) a moment later.
#
# I'm hoping dbSaveSeconds+compressSeconds is a decent standin for C-A.
#
# meh, I'll just record the most recent deliver-result timestamp.. saves are
# provoked by deliveries, so it should always be there

# we write heap-snapshot-load before sending the snapshot to the new worker

def sorted_vatIDs(vatIDs):
    return sorted(vatIDs, key=lambda vatID: int(vatID[1:]))

class Run:
    def __init__(self, d, block_height, block_time, bridge_inbound, upgrade):
        self.run_num = d["runNum"]
        self.block_height = block_height
        self.block_time = block_time
        self.run_id = "b%d-r%d" % (self.block_height, self.run_num)
        #print(self.run_id)

        self.bridge_inbound = bridge_inbound
        self.is_upgrade = bool(upgrade)

        self.classification = None
        self.details = None
        self.is_continuation = self.run_num == 0 and not self.is_upgrade
        if self.is_continuation:
            self.classification = "continuation"

        self.normal = { "deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": set() }
        self.GC = {"deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": set()  }
        self.BOYD = { "deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": [] }
        self.replay = { "deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": []  }
        self.snapshot = { "saves": 0, "loads": 0, "elapsed": 0, "vatIDs": [] }
        self.inter_delivery = { "elapsed": 0 }

        self.first_delivery = None
        self._deliver = None
        self._deliver_result = None
        self._start_time = d["time"]

        self._create_vat = None
        self._start_replay = None

        self._data = None

    def add_event(self, d):
        #print("%s .add_event(%s)" % (self.run_id, d["type"]))
        type = d["type"]
        if type == "deliver":
            self._deliver = d
            if not self.first_delivery:
                self.first_delivery = d
                if not self.is_continuation:
                    (klass, details) = classify(self.bridge_inbound, d)
                    self.classification = klass
                    self.details = details
        if type == "deliver-result":
            self._deliver_result = d
            elapsed = d["time"] - self._deliver["time"]
            computrons = d["dr"][2].get("compute")
            vd = self._deliver["vd"]
            if d.get("replay"):
                c = self.replay
            elif vd[0] == "bringOutYourDead":
                c = self.BOYD
                c["vatIDs"].append(d["vatID"])
            elif vd[0] in GC_ACTIONS:
                c = self.GC
                c["vatIDs"].add(d["vatID"])
            else:
                c = self.normal
                c["vatIDs"].add(d["vatID"])
            c["deliveries"] += 1
            c["computrons"] += computrons
            c["elapsed"] += elapsed
        if type == "cosmic-swingset-run-finish":
            self._finish_time = d["time"]
            self.run_time = self._finish_time - self._start_time
            self.used_computrons = d["usedBeans"] / 100
            #print(" finished", self.used_computrons)
        if type == "create-vat":
            self._create_vat = d
        if type == "start-replay":
            self._start_replay = d
        if type == "finish-replay":
            # upgrade (paged-out) sees: cv,hsl,sr,fr,sr,fr
            # upgrade (paged-in) sees?: sr,fr
            # page-in sees: cv,hsl,sr,fr
            cv = self._create_vat
            sr = self._start_replay
            self._create_vat = None
            self._start_replay = None
            assert(d["vatID"] == sr["vatID"])
            self.replay["vatIDs"].append(d["vatID"])
            if cv:
                startup_elapsed = d["time"] - cv["time"]
                self.snapshot["elapsed"] += startup_elapsed
            # TODO?: startup_elapsed vs sum of deliver->deliver-result times

        if type == "heap-snapshot-save":
            elapsed = d["time"] - self._deliver_result["time"]
            self.snapshot["saves"] += 1
            self.snapshot["elapsed"] += elapsed
        if type == "heap-snapshot-load":
            self.snapshot["loads"] += 1
            self.snapshot["vatIDs"].append(d["vatID"])

    def is_empty(self):
        #print("%s .is_empty" % self.run_id)
        return self.used_computrons == 0

    def sum(self, which):
        return self.normal[which] + self.GC[which] + self.BOYD[which] + self.replay[which]

    def get_data(self):
        if not self._data:
            normal = self.normal.copy()
            normal["vatIDs"] = sorted_vatIDs(normal["vatIDs"])
            GC = self.GC.copy()
            GC["vatIDs"] = sorted_vatIDs(GC["vatIDs"])
            BOYD = self.BOYD.copy()
            BOYD["vatIDs"] = sorted_vatIDs(BOYD["vatIDs"])
            replay = self.replay.copy()
            replay["vatIDs"] = sorted_vatIDs(replay["vatIDs"])
            snapshot = self.snapshot.copy()
            snapshot["vatIDs"] = sorted_vatIDs(snapshot["vatIDs"])

            total = {
                "deliveries": self.sum("deliveries"),
                "computrons": self.sum("computrons"),
                "elapsed": self.sum("elapsed") + self.snapshot["elapsed"],
                }
            self._data = {
                "id": self.run_id,
                "blockTime": self.block_time,
                "normal": normal,
                "replay": self.replay,
                "GC": GC, "BOYD": self.BOYD,
                "snapshot": self.snapshot,
                #"interDelivery": self.inter_delivery,
                "total": total,
                }
        return self._data

class ContinuedRuns:
    def __init__(self, runs):
        runids = [r.get_data()["id"] for r in runs]
        normal = { "deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": set() }
        GC = {"deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": set()  }
        BOYD = { "deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": [] }
        replay = { "deliveries": 0, "computrons": 0, "elapsed": 0, "vatIDs": []  }
        snapshot = { "saves": 0, "loads": 0, "elapsed": 0, "vatIDs": [] }
        #inter_delivery = { "elapsed": 0 }
        total = { "deliveries": 0, "computrons": 0, "elapsed": 0 }

        def do_sum(x, y):
            return sum(r.get_data()[x][y] for r in runs)
        def do_set(x, y):
            s = set()
            for r in runs:
                for vatID in r.get_data()[x]["vatIDs"]:
                    s.add(vatID)
            return sorted_vatIDs(s)
        def do_list(x, y):
            l = []
            for r in runs:
                for vatID in r.get_data()[x]["vatIDs"]:
                    l.append(vatID)
            return sorted_vatIDs(l)

        normal["deliveries"] = do_sum("normal", "deliveries")
        normal["computrons"] = do_sum("normal", "computrons")
        normal["elapsed"] = do_sum("normal", "elapsed")
        normal["vatIDs"] = do_set("normal", "vatIDs")

        GC["deliveries"] = do_sum("GC", "deliveries")
        GC["computrons"] = do_sum("GC", "computrons")
        GC["elapsed"] = do_sum("GC", "elapsed")
        GC["vatIDs"] = do_set("GC", "vatIDs")

        BOYD["deliveries"] = do_sum("BOYD", "deliveries")
        BOYD["computrons"] = do_sum("BOYD", "computrons")
        BOYD["elapsed"] = do_sum("BOYD", "elapsed")
        BOYD["vatIDs"] = do_list("BOYD", "vatIDs")

        replay["deliveries"] = do_sum("replay", "deliveries")
        replay["computrons"] = do_sum("replay", "computrons")
        replay["elapsed"] = do_sum("replay", "elapsed")
        replay["vatIDs"] = do_list("replay", "vatIDs")

        snapshot["saves"] = do_sum("snapshot", "saves")
        snapshot["loads"] = do_sum("snapshot", "loads")
        snapshot["elapsed"] = do_sum("snapshot", "elapsed")
        snapshot["vatIDs"] = do_list("snapshot", "vatIDs")

        total["deliveries"] = do_sum("total", "deliveries")
        total["computrons"] = do_sum("total", "computrons")
        total["elapsed"] = do_sum("total", "elapsed")

        #inter_delivery["elapsed"] = do_sum("interDelivery", "elapsed")

        self._data = {
            "runids": runids,
            "class": runs[0].classification,
            "details": runs[0].details,
            "block": runs[0].block_height,
            "blockTime": runs[0].block_time,
            "normal": normal,
            "GC": GC,
            "BOYD": BOYD,
            "replay": replay,
            "snapshot": snapshot,
            "total": total,
            }

    def get_data(self):
        return self._data

def iter_runs(filtered_iter):
    upgrade = None
    bridge_inbound = None
    run = None
    for d in filtered_iter:
        type = d["type"]
        if type == "cosmic-swingset-upgrade-start":
            # first block after chain-halting upgrade sees -upgrade-start,
            # -upgrade-finish, -begin-block
            upgrade = d
        if type == "cosmic-swingset-begin-block":
            block_height = d["blockHeight"]
            block_time = d["blockTime"]
        if type == "cosmic-swingset-bridge-inbound":
            bridge_inbound = d
        if type == "cosmic-swingset-run-start":
            run = Run(d, block_height, block_time, bridge_inbound, upgrade)
        if run:
            run.add_event(d)
        if type == "cosmic-swingset-run-finish":
            yield run
            run = None
            upgrade = None
            bridge_inbound = None

def iter_continued_runs(runs_iter):
    run_sequence = []
    for run in runs_iter:
        if not run.is_continuation:
            if run_sequence:
                yield ContinuedRuns(run_sequence)
                run_sequence = []
        if not run.is_empty():
            run_sequence.append(run)
    if run_sequence:
        yield ContinuedRuns(run_sequence)
        run_sequence = []

filtered_iter = parse_and_filter(sys.stdin)
runs_iter = iter_runs(filtered_iter)
#for run in runs_iter:
#    if run.is_empty():
#        continue
#    print(json.dumps(run.get_data()))

continued_runs_iter = iter_continued_runs(runs_iter)
for continued_run in continued_runs_iter:
    print(json.dumps(continued_run.get_data()))


# cat runs.new |jq -c 'select((.replay.vatIDs | length) > 0) | [.id, .total.elapsed, .replay.elapsed, .replay.vatIDs]'
# cat runs.new |jq -c 'select(.BOYD.deliveries > 0) | [.id, .total.elapsed, .BOYD.elapsed, .BOYD.vatIDs]'
# cat runs.new |jq -c 'select(.snapshot.loads > 0) | [.id, .total.elapsed, .snapshot]'

# lz4cat run-58-chain.slog.lz4 |python3 ~/stuff/agoric/trees/agoric-sdk/packages/SwingSet/misc-tools/filter-slog.py cosmic-swingset- deliver heap-snapshot- vat-startup- =start-replay =finish-replay =create-vat |gzip >slog-filtered.gz
# gzcat slog-filtered.gz |python3 ~/stuff/agoric/trees/agoric-sdk/packages/SwingSet/misc-tools/classify-runs-new.py >continued-runs.new
# (gzcat ~/stuff/agoric/mainnet-logs/agreeable/run-5[012]/run-*-chain.slog.gz; lz4cat ~/stuff/agoric/mainnet-logs/agreeable/run-5[345678]/run-*-chain.slog.lz4) | python3 ~/stuff/agoric/trees/agoric-sdk/packages/SwingSet/misc-tools/classify-runs-new.py >runs-50-58.jsonl

## for c in `cat continued-runs.new | jq -r '.classification' |sort |uniq`; do echo $c; cat continued-runs.new |jq -c "select(.classification==\"${c}\")" >classes/${c}.jsonl; done
# cat runs-5* | jq -r '.class' |sort |uniq >classes.txt
# for c in `cat classes.txt`; do echo $c; cat runs-5*.jsonl |jq -c "select(.class==\"${c}\")" >classes/${c}.jsonl; done

