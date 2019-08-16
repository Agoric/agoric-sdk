from twisted.internet.task import react
from twisted.internet import endpoints, defer
from twisted.python import usage
import wormhole
import treq
import json
import os.path
import shutil
import subprocess
import sys
import os
import urllib.request

MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
#MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"
NETWORK_CONFIG = "https://testnet.agoric.com/network-config"
# We need this to connect to cloudflare's https.
USER_AGENT = "Mozilla/5.0"

# Locate the ag-solo binary.
# Look up until we find a different bin directory.
candidate = os.path.normpath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', '..'))
AG_SOLO = os.path.join(candidate, 'bin', 'ag-solo')
while not os.path.exists(AG_SOLO):
  next_candidate = os.path.dirname(candidate)
  if next_candidate == candidate:
    AG_SOLO = 'ag-solo'
    break
  candidate = next_candidate
  AG_SOLO = os.path.join(candidate, 'bin', 'ag-solo')

class Options(usage.Options):
    optParameters = [
        ["webhost", "h", "127.0.0.1", "client-visible HTTP listening address"],
        ["webport", "p", "8000", "client-visible HTTP listening port"],
        ["netconfig", None, NETWORK_CONFIG, "website for network config"]
    ]
    def parseArgs(self, basedir=os.environ.get('AG_SOLO_BASEDIR', 'agoric')):
        self['basedir'] = os.environ['AG_SOLO_BASEDIR'] = basedir


def setIngress(sm):
    print('Setting chain parameters with ' + AG_SOLO)
    subprocess.run([AG_SOLO, 'set-gci-ingress', '--chainID=%s' % sm['chainName'], sm['gci'], *sm['rpcAddrs']], check=True)
def restart():
    print('Restarting ' + AG_SOLO)
    os.execvp(AG_SOLO, [AG_SOLO, 'start', '--role=client'])

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
    yield w.close()

    if not sm['ok']:
        print("error from server:", sm['error'])
        return

    BASEDIR = o['basedir']
    setIngress(sm)
    restart()

def doInit(o):
    BASEDIR = o['basedir']
    # run 'ag-solo init BASEDIR'
    subprocess.run([AG_SOLO, 'init', BASEDIR, '--webhost=' + o['webhost'], '--webport=' + o['webport']], check=True)

def main():
    o = Options()
    o.parseOptions()
    pkeyFile = os.path.join(o['basedir'], 'ag-cosmos-helper-address')
    # If the public key file does not exist, just init and run.
    if not os.path.exists(pkeyFile):
        doInit(o)

        # read the pubkey out of BASEDIR/ag-cosmos-helper-address
        pkfile = open(pkeyFile)
        pubkey = pkfile.read()
        pkfile.close()
        pubkey = pubkey.strip()
        react(run_client, (o,pubkey))
        sys.exit(1)

    yesno = input('Type "yes" to reset state from ' + o['netconfig'] + ', anything else cancels: ')
    if yesno.strip() != 'yes':
        print('Cancelling!')
        sys.exit(1)

    # Download the netconfig.
    print('downloading netconfig from', o['netconfig'])
    req = urllib.request.Request(o['netconfig'], data=None, headers={'User-Agent': USER_AGENT})
    resp = urllib.request.urlopen(req)
    encoding = resp.headers.get_content_charset('utf-8')
    decoded = resp.read().decode(encoding)
    netconfig = json.loads(decoded)

    connections_json = os.path.join(o['basedir'], 'connections.json')
    conns = []
    try:
      f = open(connections_json)
      conns = json.loads(f.read())
    except FileNotFoundError:
      pass

    # Maybe just run the ag-solo command if our params already match.
    for conn in conns:
      if 'GCI' in conn and conn['GCI'] == netconfig['gci']:
        print('Already have an entry for ' + conn['GCI'] + '; not replacing')
        restart()
        sys.exit(1)

    # Blow away everything except the key file and state dir.
    helperStateDir = os.path.join(o['basedir'], 'ag-cosmos-helper-statedir')
    for name in os.listdir(o['basedir']):
      p = os.path.join(o['basedir'], name)
      if p == pkeyFile or p == helperStateDir:
        continue
      if os.path.isdir(p) and not os.path.islink(p):
        shutil.rmtree(p)
      else:
        os.remove(p)

    # Upgrade the ag-solo files.
    doInit(o)

    setIngress(netconfig)
    restart()
    sys.exit(1)
