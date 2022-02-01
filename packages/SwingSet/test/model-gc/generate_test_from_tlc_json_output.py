import json
import random
import orjson
from collections import Counter
from os import listdir
from os.path import isfile, join


def prettystr(obj):
    return orjson.dumps(
        obj, option=orjson.OPT_INDENT_2 | orjson.OPT_APPEND_NEWLINE
    ).decode("utf-8")


def prettydump(obj, fn="debug.json"):
    with open(fn, "w") as f:
        f.write(prettystr(obj))


class Bank:
    """
    It's necessary to somewhat mirror the models bank as commands proceed.
    This is because we need concrete actions which require item ids, but these can only
    be deduced from the trace if we keep track of which item ids are in which bank slit.
    """

    class ItemId:
        """
        Monotonically increasing generator
        """

        def __init__(self):
            self.val = 0

        def getNext(self):
            ret = self.val
            self.val += 1
            return ret

    def __init__(self):
        # Properties are intended to be accessed freely
        self.slit_to_item_id = [None] * 10
        self.iid = self.ItemId()

        """
        Map vat names to a list of store await overwrites that it must do
        A store await overwrite means that a promise was resolved, and that promise lives
        in the vat's store. The vat should await that promise, overwriting the
        id to the result.

        An await cmd looks like {read: Int, write:Int}
        """
        self.await_queue = {k: [] for k in {"vt0", "vt1", "vt2"}}


def listify(cmd):
    ret = {}
    for k, v in cmd.items():
        ret[k] = list(v) if type(v) is set else v
    return ret


def get_init(bank, data):
    """
    Handle the special case of the init commands.

    data is the state data that has been extracted from the Apalache json
    and is enough to deduce init commands.
    """

    def createVatRefCmd(vat, k):
        # Create a vat reference and store it at itemId
        return {"type": "initCreateVatRef", "vat": vat, "itemId": k}

    def giveItemCmd(vat, k):
        # Call special method on vat to just give it an item directly
        return {"type": "initGiveItem", "vat": vat, "itemId": k}

    ret = []
    for i, slit in enumerate(data["bank"]):
        if slit["type"] == "vat":

            creator = slit["creator"]

            # Track the item for future
            k = bank.iid.getNext()
            bank.slit_to_item_id[i] = k

            ret.append(createVatRefCmd(creator, k))

            for watcher in slit["watchers"]:
                ret.append(giveItemCmd(watcher, k))

    return ret


def get_transition_command(bank, a, b):

    actor = a["curr"]
    # Action type is given in the _after_ state
    action = b["step"]
    a_bank = a["bank"]
    b_bank = b["bank"]

    cmd = {}
    cmd["type"] = action
    cmd["actor"] = actor

    # Consume the await queue
    cmd["awaits"] = bank.await_queue[actor]
    bank.await_queue[actor] = []

    def transferControl():
        cmd["targetVat"] = b["curr"]
        """
        Special case: when there is a transfer of control the actor vat of the previous step
        relinquishes control to boot
        """
        cmd["actor"] = "boot"

    def sendItem():
        """Send item: add a new watcher to an item"""
        a_watchers = [e["watchers"] for e in a_bank]
        b_watchers = [e["watchers"] for e in b_bank]
        receiver_vat_name = None
        for i, (x, y) in enumerate(zip(a_watchers, b_watchers)):
            # Find slit where watcher sets differ between states
            if x != y:
                # Only 1 watcher should be added
                assert len(x) + 1 == len(y)
                # Actor is able to see the item it sends
                assert actor in x

                receiver_vat_name = list(set(y).difference(set(x)))[0]

                targetVatId = None
                # Collect ids which can be used to send the item to the receiver vat
                for j, slit in enumerate(a_bank):
                    # A vat ref is modelled by being created by the vat it identifies
                    if (
                        slit["type"] == "vat"
                        and slit["creator"] == receiver_vat_name
                        and actor in slit["watchers"]
                    ):
                        targetVatId = bank.slit_to_item_id[j]
                        break

                cmd["targetVatId"] = targetVatId

                # Infer itemId from bank state
                cmd["itemId"] = bank.slit_to_item_id[i]
                return
        assert False, "Could not deduce sendItem command from given state pair"

    def dropItem():
        for i, (x, y) in enumerate(zip(a_bank, b_bank)):
            # Find the slit where the watcher is dropped
            if actor in x["watchers"] and actor not in y["watchers"]:
                cmd["itemId"] = bank.slit_to_item_id[i]
                return
        assert False, "Could not deduce dropItem command from given state pair"

    def storeSelfRef():
        for i, (x, y) in enumerate(zip(a_bank, b_bank)):
            # Find slit where the type differs between states
            if x["type"] != y["type"]:
                assert x["type"] == "blank"
                assert y["type"] == "vat"
                # If newly created a vat ref should not have (not 1) watchers
                assert len(y["watchers"]) == 1
                # Cache item id for future command inference
                iid = bank.iid.getNext()
                bank.slit_to_item_id[i] = iid
                cmd["itemId"] = iid

    def storePromise():
        # The model increments cnt_promise and uses the new value as the id for the new promise
        model_promise_id = b["cnt_promise"]
        promise_item_id, resolver_item_id = None, None
        for i, slit in enumerate(b_bank):
            if slit["type"] == "promise" and slit["promiseId"] == model_promise_id:
                assert a_bank[i]["type"] == "blank"
                promise_item_id = bank.iid.getNext()
                bank.slit_to_item_id[i] = promise_item_id
            if slit["type"] == "resolver" and slit["promiseId"] == model_promise_id:
                assert a_bank[i]["type"] == "blank"
                resolver_item_id = bank.iid.getNext()
                bank.slit_to_item_id[i] = resolver_item_id
        assert promise_item_id != None, "Could not deduce storePromise command (1)"
        assert resolver_item_id != None, "Could not deduce storePromise command (2)"
        cmd["promiseId"] = promise_item_id
        cmd["resolverId"] = resolver_item_id

    def resolve():
        """
        Deduce a resolve cmd

        The model tracks an extra variable: resolve_target to make deducing the concrete command possible.

        We need to map the bank slits used in the model to the item ids that are present in the running system.

        ~~~~~~~~~

        In the model a resolve is implemented by transferring the watchers of the promise
        to the watchers of the resolved-to item, and nulling both the promise and the resolver.

        This means that in the driver both the store K,V pairs with the promise Id and the resolved-to
        item Id both reference the same bank slit, but they will have different keys.

        Therefore when a resolver is called, await commands will added to the await queues of each vat
        which is watching the promise. The next time each watching vat does a step they will first
        await all the promises in their await queue.
        """

        # The model caches this helpful value in order to deterministically deduce a resolve target
        resolve_target_ix = b["resolve_target"]

        promise_ix = None
        resolver_ix = None
        for i, (x, y) in enumerate(zip(a_bank, b_bank)):
            if x["type"] == "promise" and y["type"] == "blank":
                promise_ix = i
            if x["type"] == "resolver" and y["type"] == "blank":
                resolver_ix = i

        # The resolve command only cares about the resolver and the item to resolve to
        # It does _not_ need a handle to the promise
        cmd["resolveItemId"] = bank.slit_to_item_id[resolve_target_ix]
        cmd["resolverId"] = bank.slit_to_item_id[resolver_ix]

        for watcher in a_bank[promise_ix]["watchers"]:
            bank.await_queue[watcher].append(
                {
                    "read": bank.slit_to_item_id[promise_ix],
                    "write": bank.slit_to_item_id[resolve_target_ix],
                }
            )

        bank.slit_to_item_id[promise_ix] = None
        bank.slit_to_item_id[resolver_ix] = None

    if action == "transferControl":
        transferControl()
    if action == "sendItem":
        sendItem()
    if action == "dropItem":
        dropItem()
    if action == "storeSelfRef":
        storeSelfRef()
    if action == "storePromise":
        storePromise()
    if action == "resolve":
        resolve()

    return listify(cmd)


def convert_trace_states_to_test_driver(states):
    """
    Create a json object containing all the info needed to create a test driver to simulate a trace.
    """

    # Need to model the TLA model's bank a bit here to be able to deduce concrete actions
    bank = Bank()

    ret = {}
    ret["init"] = get_init(bank, states[0])  # Handle the special case
    ret["transitions"] = []

    # Transfer to first vat
    ret["transitions"].append(
        {"type": "transferControl", "actor": "boot", "targetVat": states[0]["curr"]}
    )

    for i in range(len(states) - 1):
        a = states[i]
        b = states[i + 1]
        cmd = get_transition_command(bank, a, b)
        ret["transitions"].append(cmd)

    # It's useful to append some metadata for debugging at a glance - just add the list of actions (steps)
    ret["actions"] = [t["type"] for t in ret["transitions"]]

    return ret


def get_json_traces_from_json_lists_of_states():
    """
    tla2json will produce a list of states when it is given
    a TLC output containing multiple traces. Therefore we must
    split the states into separate traces.
    """

    DIR_NAME = "tlc_out"
    fns = [f for f in listdir(DIR_NAME) if isfile(join(DIR_NAME, f))]
    fns = [fn for fn in fns if fn.endswith(".json")]
    print(fns)

    # Map filename, index in filename to json trace
    all_traces = {}
    seen = set()
    cnt = 0
    for fn in fns:
        with open(f"{DIR_NAME}/{fn}", "r") as f:
            obj = json.loads(f.read())
            trace = []
            for i, state in enumerate(obj):
                if state["no"] == 1:
                    if 0 < len(trace):
                        cnt += 1
                        dmp = json.dumps(trace)
                        if not dmp in seen:
                            seen.add(dmp)
                            all_traces[(fn, i)] = trace
                    trace = []
                trace.append(state["state"])

    return [
        {"name": k[0], "num": k[1], "script": convert_trace_states_to_test_driver(v)}
        for k, v in all_traces.items()
    ]


if __name__ == "__main__":
    scripts = get_json_traces_from_json_lists_of_states()
    print(len(scripts))
    print(prettydump(scripts[0]))

    def cnt(actions):
        """
        Count number of transferControl steps in the trace
        """
        return len([1 for a in actions if a == "transferControl"])

    scripts = [
        s
        for s in scripts
        if 0 < cnt(s["script"]["actions"]) and cnt(s["script"]["actions"]) < 5
    ]

    # Shuffle ensures tests are mixed despite lazy sort
    random.shuffle(scripts)
    scripts.sort(key=lambda s: cnt(s["script"]["actions"]))
    print(len(scripts))
    scripts = scripts[:50000]
    with open("traces.json", "w") as f:
        f.write(json.dumps(scripts))
