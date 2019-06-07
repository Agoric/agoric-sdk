from twisted.internet.task import react
from twisted.internet import endpoints, defer
from twisted.python import usage
import wormhole
import treq
import json
import os.path
import os
import subprocess
import sys

MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
#MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"

class Options(usage.Options):
    optParameters = [
        ]
    def parseArgs(self, basedir):
        self['basedir'] = basedir

@defer.inlineCallbacks
def run_client(reactor, o, pubkey):
    w = wormhole.create(APPID, MAILBOX_URL, reactor)
    wormhole.input_with_completion("Provisioning code: ", w.input_code(), reactor)
    cm = json.dumps({
        "pubkey": pubkey,
        })
    w.send_message(cm.encode("utf-8"))
    server_message = yield w.get_message()
    sm = json.loads(server_message.decode("utf-8"))
    print("server message is", sm)
    # TODO: Where do we put the message?
    yield w.close()

def guard(path, fun):
    try:
        os.stat(path)
        return True
    except OSError:
        return fun()

def doInit(o):
    BASEDIR = o['basedir']
    AG_SOLO = 'bin/ag-solo'
    try:
        os.stat(AG_SOLO)
    except OSError:
        AG_SOLO = 'ag-solo'
    # run 'ag-solo init BASEDIR'
    subprocess.run([AG_SOLO, 'init', BASEDIR], check=True)

def main():
    o = Options()
    o.parseOptions()
    pkeyFile = o['basedir'] + '/ag-cosmos-helper-address'
    # If it doesn't exist, run the ag-solo init.
    guard(pkeyFile, lambda: doInit(o))
    # read the pubkey out of BASEDIR/ag-cosmos-helper-address
    pkfile = open(pkeyFile)
    pubkey = pkfile.read()
    pkfile.close()
    react(run_client, (o,pubkey))
