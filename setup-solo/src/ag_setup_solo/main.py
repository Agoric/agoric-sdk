from twisted.internet.task import react
from twisted.internet import endpoints, defer
from twisted.python import usage
import wormhole
import treq
import json
import os.path
import subprocess
import sys

MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
#MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"

# Locate the ag-solo binary.
AG_SOLO = os.path.abspath('bin/ag-solo')
if not os.path.exists(AG_SOLO):
    AG_SOLO = 'ag-solo'

START_DIR = os.path.abspath('.')

class Options(usage.Options):
    optParameters = [
        ["webhost", "h", "127.0.0.1", "client-visible HTTP listening address"],
        ["webport", "p", "8000", "client-visible HTTP listening port"],
    ]
    def parseArgs(self, basedir=os.environ['AG_SOLO_BASEDIR']):
        self['basedir'] = os.environ['AG_SOLO_BASEDIR'] = basedir

@defer.inlineCallbacks
def run_client(reactor, o, pubkey):
    w = wormhole.create(APPID, MAILBOX_URL, reactor)
    # FIXME: Handle SIGINT!
    wormhole.input_with_completion("Provisioning code: ", w.input_code(), reactor)
    cm = json.dumps({
        "pubkey": pubkey,
        })
    w.send_message(cm.encode("utf-8"))
    server_message = yield w.get_message()
    sm = json.loads(server_message.decode("utf-8"))
    print("server message is", sm)
    yield w.close()

    if not sm['ok']:
        print("error from server:", sm['error'])
        return

    BASEDIR = o['basedir']
    subprocess.run([AG_SOLO, 'set-gci-ingress', '--chainID=%s' % sm['chainName'], sm['gci'], *sm['rpcAddrs']], check=True)
    subprocess.run([AG_SOLO, 'start'], check=True)

def guard(path, fun):
    if os.path.exists(path):
        return True
    return fun()

def doInit(o):
    BASEDIR = o['basedir']
    # run 'ag-solo init BASEDIR'
    subprocess.run([AG_SOLO, 'init', BASEDIR, '--webhost=' + o['webhost'], '--webport=' + o['webport']], check=True)

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
    pubkey = pubkey.strip()
    react(run_client, (o,pubkey))
