from twisted.internet.task import react
from twisted.internet import endpoints, defer
from twisted.python import usage
import wormhole
import treq
import json
import os.path

#MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"


class Options(usage.Options):
    optParameters = [
        ]

@defer.inlineCallbacks
def run_client(reactor, o):
    # run 'ag-solo init BASEDIR'
    # read the pubkey out of BASEDIR/ag-cosmos-helper-address
    pubkey = "the pubkey"
    w = wormhole.create(APPID, MAILBOX_URL, reactor)
    wormhole.input_with_completion("Provisioning code: ", w.input_code(), reactor)
    cm = json.dumps({
        "pubkey": pubkey,
        })
    w.send_message(cm.encode("utf-8"))
    server_message = yield w.get_message()
    sm = json.loads(server_message.decode("utf-8"))
    print("server message is", sm)
    yield w.close()

def main():
    o = Options()
    o.parseOptions()
    react(run_client, (o,))
