from twisted.internet.task import react, deferLater
from twisted.web import static, resource, server
from twisted.web.template import Element, XMLFile, renderer, flattenString
from twisted.internet import endpoints, defer, protocol
from twisted.python import usage
import wormhole
import treq
import os.path
import os
import json
import random
from tempfile import NamedTemporaryFile

from twisted.python import log
import sys
log.startLogging(sys.stdout)

# TODO: Don't hardcode these.
INITIAL_TOKEN = [1, 'agmedallion']
AG_BOOTSTRAP_PASSWORD = b'mmmmmmmm'

MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
#MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"

htmldir = os.path.join(os.path.dirname(__file__), "html")

class SetConfigOptions(usage.Options):
    pass

class AddPubkeysOptions(usage.Options):
    optParameters = [
        ["controller", "c", "http://localhost:8002/vat", "controller's listening port for us to send control messages"],
    ]

class StartOptions(usage.Options):
    optParameters = [
        ["mountpoint", "m", "/", "controller's top level web page"],
        ["listen", "l", "tcp:8001", "client-visible HTTP listening port"],
        ["controller", "c", "http://localhost:8002/vat", "controller's listening port for us to send control messages"],
    ]

class Options(usage.Options):
    subCommands = [
        ['set-cosmos-config', None, SetConfigOptions, "Pipe output of 'ag-setup-cosmos show-config' to this command"],
        ['add-pubkeys', None, AddPubkeysOptions, 'Add public keys from saved database'],
        ['start', None, StartOptions, 'Start the HTTP server'],
        ]
    optParameters = [
        ["home", None, os.path.join(os.environ["HOME"], '.ag-pserver'), "provisioning-server's state directory"],
        ]

class SendInputAndWaitProtocol(protocol.ProcessProtocol):
    def __init__(self, d, input):
        self.deferred = d
        self.input = input
        self.output = b''
        self.error = b''

    def connectionMade(self):
        self.transport.write(self.input)
        self.transport.closeStdin()
    
    def outReceived(self, data):
        self.output += data
        print(data.decode('latin-1'))

    def errReceived(self, data):
        self.error += data
        print(data.decode('latin-1'), file=sys.stderr)
    
    def processEnded(self, reason):
        self.deferred.callback((reason.value.exitCode, self.output, self.error))

def cosmosConfigFile(home):
    return os.path.join(home, 'cosmos-chain.json')

def pubkeyDatabase(home):
    return os.path.join(home, 'pubkeys.jsona')

class ConfigElement(Element):
    loader = XMLFile(os.path.join(htmldir, "index.html"))

    @staticmethod
    def gatherArgs(opts):
        meta = {}
        f = open(cosmosConfigFile(opts['home']))
        config = f.read()
        gr = '/usr/src/app/lib/git-revision.txt'
        if os.path.exists(gr):
            f = open(gr)
            meta['package_git'] = f.read().strip()
        else:
            f = os.popen('git rev-parse --short HEAD')
            sha = f.read().strip()
            f = os.popen('git diff --quiet || echo -dirty')
            meta['package_git'] = sha + f.read().strip()

        pj = '/usr/src/app/package.json'
        pjson = {}
        if os.path.exists(pj):
            f = open(pj)
            pjson = json.load(f)
        else:
            pjpath = None
            # Walk upwards from the current directory.
            pj = os.path.abspath('package.json')
            while pj != pjpath:
                pjpath = pj
                if os.path.exists(pjpath):
                    f = open(pjpath)
                    pjson = json.load(f)
                    break
            pj = os.path.join(os.path.dirname(pjpath), '../package.json')
            pj = os.path.abspath(pj)

        meta['package_version'] = pjson.get('version', 'unknown')
        meta['package_name'] = pjson.get('name', 'cosmic-swingset')
        repo = pjson.get('repository', 'https://github.com/Agoric/cosmic-swingset')
        cleanRev = meta['package_git'].replace('-dirty', '')
        link = repo + '/commit/' + cleanRev
        meta['package_repo'] = link

        return [config, meta]

    def __init__(self, config, meta):
        self._config = config
        self._meta = meta

    @renderer
    def config(self, request, tag):
        tag.fillSlots(cosmos_config=self._config)
        return tag

    @renderer
    def meta(self, request, tag):
        tag.fillSlots(**self._meta)
        return tag

class ResponseElement(ConfigElement):
    loader = XMLFile(os.path.join(htmldir, "response-template.html"))

    def __init__(self, code, nickname, *args):
        super().__init__(*args)
        self._code = code
        self._nickname = nickname
    
    @renderer
    def code(self, request, tag):
        return self._code
    
    @renderer
    def nickname(self, request, tag):
        return self._nickname

class Provisioner(resource.Resource):
    def __init__(self, reactor, o):
        self.reactor = reactor
        self.opts = o

    @defer.inlineCallbacks
    def build_page(self):
        f = open(cosmosConfigFile(self.opts['home']))
        config = f.read()

        args = ConfigElement.gatherArgs(self.opts)
        html = yield flattenString(None, ConfigElement(*args))
        return html

    def render_GET(self, req):
        d = self.build_page()
        def built(response):
            req.write(response)
            req.finish()
        d.addCallback(built)
        d.addErrback(log.err)
        return server.NOT_DONE_YET


@defer.inlineCallbacks
def enablePubkey(reactor, opts, config, nickname, pubkey, initialToken = INITIAL_TOKEN):
    mobj = {
        "type": "pleaseProvision",
        "nickname": nickname,
        "pubkey": pubkey,
    }
    # print("mobj:", mobj)
    def ret(server_message):
        return [mobj, server_message, config]

    # FIXME: Make more resilient to DOS attacks, or attempts
    # to drain all our agmedallions.
    if initialToken is not None:
        amountToken = ''.join([str(o) for o in initialToken])
        args = [
            'tx', 'send', config['bootstrapAddress'], pubkey, amountToken,
            '--yes', '--broadcast-mode', 'block', # Don't return until committed.
        ]
        code, output = yield agCosmosHelper(reactor, opts, config, AG_BOOTSTRAP_PASSWORD + b'\n', args, 10)
        if code != 0:
            return ret({"ok": False, "error": 'transfer returned ' + str(code)})

    controller_url = opts["controller"]
    print('contacting ' + controller_url)
    m = json.dumps(mobj)

    # this HTTP request goes to the controller machine, where it should
    # be routed to vat-provisioning.js and the pleaseProvision() method.
    try:
        resp = yield treq.post(controller_url, m.encode('utf-8'), reactor=reactor,
                                headers={
                                    b'Content-Type': [b'application/json'],
                                    b'Origin': [b'http://127.0.0.1'],
                                })
        if resp.code < 200 or resp.code >= 300:
            raise Exception('invalid response code ' + str(resp.code))
        rawResp = yield treq.json_content(resp)
    except Exception as e:
        print('controller error', e)
        return ret({"ok": False, "error": str(e)})
    if not rawResp.get("ok"):
        print("provisioning server error", rawResp)
        return ret({"ok": False, "error": rawResp.get('rej')})
    r = rawResp['res']
    ingressIndex = r["ingressIndex"]
    # this message is sent back to setup-solo/src/ag_setup_solo/main.py
    server_message = {
        "ok": True,
        "gci": config['gci'],
        "rpcAddrs": config['rpcAddrs'],
        "chainName": config['chainName'],
        "ingressIndex": ingressIndex,
    }
    print("send server_message", server_message)
    return ret(server_message)


class RequestCode(resource.Resource):
    def __init__(self, reactor, o):
        self.reactor = reactor
        self.opts = o

    @defer.inlineCallbacks
    def got_message(self, client_message, nickname):
        cm = json.loads(client_message.decode("utf-8"))
        f = open(cosmosConfigFile(self.opts['home']))
        config = json.loads(f.read())

        msgs = yield enablePubkey(self.reactor, self.opts, config, nickname, cm['pubkey'])
        return msgs

    def send_provisioning_response(self, msgs, w):
        [mobj, server_message, config] = msgs
        sm = json.dumps(server_message).encode("utf-8")
        print("send provisioning response", server_message)
        w.send_message(sm)
        d = w.close()
        def complete(_):
            print("provisioning complete")
            pkobj = {
                'chainName': config['chainName'],
                'pubkey': mobj['pubkey'],
                'nickname': mobj['nickname'][:32],
            }
            print("save public key to database", pkobj)
            pkobj_str = json.dumps(pkobj)
            with open(pubkeyDatabase(self.opts['home']), 'a') as db:
                db.write(pkobj_str + ',\n')
        d.addCallbacks(complete,
                       lambda f: print("provisioning error", f))

    @defer.inlineCallbacks
    def process_wormhole(self, nickname):
        w = wormhole.create(APPID, MAILBOX_URL, self.reactor)
        w.allocate_code()
        code = yield w.get_code()

        d = w.get_message()
        d.addCallback(self.got_message, nickname.decode('utf-8'))
        d.addCallback(self.send_provisioning_response, w)
        return code

    @defer.inlineCallbacks
    def build_provisioning_response(self, nickname):
        code = yield self.process_wormhole(nickname)
        args = ConfigElement.gatherArgs(self.opts)
        html = yield flattenString(None, ResponseElement(code, nickname, *args))
        return html

    def render_POST(self, req):
        nickname = req.args[b"nickname"][0]
        print(nickname)
        d = self.build_provisioning_response(nickname)
        def built(response):
            req.write(response)
            req.finish()
        d.addCallback(built)
        d.addErrback(log.err)
        return server.NOT_DONE_YET

    def render_GET(self, req):
        nickname = req.args[b"nickname"][0]
        d = self.process_wormhole(nickname)
        def built(code):
            req.setHeader('Content-Type', 'text/plain; charset=UTF-8')
            req.write((code + '\n').encode('utf-8'))
            req.finish()
        d.addCallback(built)
        d.addErrback(log.err)
        return server.NOT_DONE_YET


class ConfigJSON(resource.Resource):
    def __init__(self, o):
        self.opts = o

    def render_GET(self, req):
        f = open(cosmosConfigFile(self.opts['home']))
        config = f.read()
        req.setHeader('Content-Type', 'application/json')
        return config.encode('utf-8')

def run_server(reactor, o):
    print("dir is", __file__)
    root = static.File(htmldir)
    provisioner = Provisioner(reactor, o)
    root.putChild(b"", provisioner)
    root.putChild(b"index.html", provisioner)
    root.putChild(b"request-code", RequestCode(reactor, o))

    # Prefix the mountpoints.
    revpaths = o['mountpoint'].split('/')
    revpaths.reverse()
    for dir in revpaths:
        # print('mount root under ' + dir)
        if dir != '':
            r = resource.Resource()
            r.putChild(dir.encode('utf-8'), root)
            root = r

    # Display the JSON config.
    root.putChild(b"network-config", ConfigJSON(o))

    site = server.Site(root)
    s = endpoints.serverFromString(reactor, o["listen"])
    s.listen(site)
    print("server running")
    return defer.Deferred()

@defer.inlineCallbacks
def agCosmosHelper(reactor, opts, config, input, args, retries = 1):
    code = None
    while code != 0 and retries > 0:
        if code is not None:
            # Wait 3 seconds between sends.
            yield deferLater(reactor, 3, lambda: None)
        retries -= 1
        rpcAddr = random.choice(config['rpcAddrs'])
        print('running', rpcAddr, args)
        d = defer.Deferred()
        processProtocol = SendInputAndWaitProtocol(d, input)
        program = 'ag-cosmos-helper' 
        reactor.spawnProcess(processProtocol, '/usr/local/bin/' + program, args=[
            program, *args,
            '--chain-id', config['chainName'], '-ojson',
            '--node',
            'tcp://' + rpcAddr,
            '--home', os.path.join(opts['home'], 'ag-cosmos-helper-statedir'),
            ])
        code, output, stderr = yield d
        if code == 0:
            oj = json.loads(output.decode('utf-8'))
            code = oj.get('code', code)
            output = oj
        elif stderr[0:8] == b'ERROR: {':
            try:
                oj = json.loads(stderr[7:].decode('utf-8'))
                code = oj.get('code', code)
                output = oj
            except:
                pass
        elif stderr[0:14] == b'gas estimate: ':
            lines = stderr.split(b'\n')
            oj = json.loads(lines[1].decode('utf-8'))
            if oj.get('type') is None:
                # Reformat the message into what --generate-only produces.
                output = {
                    'type': 'cosmos-sdk/StdTx',
                    'value': {
                        'msg': oj['msgs'],
                        'fee': oj['fee'],
                        'signatures': None,
                        'memo': '',
                    }}
            else:
                output = oj
            code = 0

    return code, output

@defer.inlineCallbacks
def doEnablePubkeys(reactor, opts, config, pkobjs):
    amountToken = ''.join([str(o) for o in INITIAL_TOKEN])

    txes = []
    needIngress = []
    for pkobj in pkobjs:
        pubkey = pkobj['pubkey']
        missing = False
        try:
            print('checking account', pubkey)
            code, output = yield agCosmosHelper(reactor, opts, config, b'', ['query', 'account', pubkey])
            if code == 0 and output['type'] == 'cosmos-sdk/Account':
                needIngress.append(pkobj)
                missing = True
                for coin in output['value']['coins']:
                    # Check if they have some of our coins.
                    if coin['denom'] == INITIAL_TOKEN[1] and int(coin['amount']) >= INITIAL_TOKEN[0]:
                        missing = False
                        break
            elif code == 9:
                needIngress.append(pkobj)
                missing = True
        except Exception as e:
            missing = False
            print(e)

        if missing:
            print('generating transaction for', pubkey)
            # Estimate the gas, with a little bit of padding.
            args = ['tx', 'send', config['bootstrapAddress'], pubkey, amountToken, '--gas=auto', '--gas-adjustment=1.05']
            code, output = yield agCosmosHelper(reactor, opts, config, b'', args, 1)
            if code == 0:
                txes.append(output)

    if len(txes) > 0:
        tx0 = txes[0]
        msgs = tx0['value']['msg']
        # Add up all the gases.
        gas = int(tx0['value']['fee']['gas'])
        for tx in txes[1:]:
            val = tx['value']
            gas += int(val['fee']['gas'])
            for msg in val['msg']:
                msgs.append(msg)
        tx0['value']['fee']['gas'] = str(gas)
        # Create a temporary file that is automatically deleted.
        with NamedTemporaryFile() as temp:
            # Save the amalgamated transaction.
            temp.write(json.dumps(tx0).encode('utf-8'))
            temp.flush()

            # Now the temp.name contents are available
            args = [
                'tx', 'sign', temp.name, '--from', config['bootstrapAddress'],
                '--yes', '--append=false',
            ]

            # Use the temp file in the sign request.
            code, output = yield agCosmosHelper(reactor, opts, config, AG_BOOTSTRAP_PASSWORD + b'\n', args, 10)
        if code != 0:
            raise Exception('Cannot sign transaction')
        with NamedTemporaryFile() as temp:
            # Save the signed transaction.
            temp.write(json.dumps(output).encode('utf-8'))
            temp.flush()

            # Now the temp.name contents are available
            args = [
                'tx', 'broadcast', temp.name,
                '--broadcast-mode', 'block',
            ]

            code, output = yield agCosmosHelper(reactor, opts, config, b'', args, 10)
        if code != 0:
            raise Exception('Cannot broadcast transaction')

    if len(needIngress) > 0:
        controller_url = opts["controller"]
        print('contacting ' + controller_url)

        mobj = {
            "type": "pleaseProvisionMany",
            "applies": [[pkobj['nickname'], pkobj['pubkey']] for pkobj in needIngress]
        }
        m = json.dumps(mobj)

        # this HTTP request goes to the controller machine, where it should
        # be routed to vat-provisioning.js and the pleaseProvision() method.
        resp = yield treq.post(controller_url, m.encode('utf-8'), reactor=reactor,
                                headers={
                                    b'Content-Type': [b'application/json'],
                                    b'Origin': [b'http://127.0.0.1'],
                                })
        if resp.code < 200 or resp.code >= 300:
            raise Exception('invalid response code ' + str(resp.code))
        rawResp = yield treq.json_content(resp)
        if not rawResp.get('ok', False):
            raise Exception('response not ok ' + str(rawResp))

def main():
    o = Options()
    o.parseOptions()
    if o.subCommand == 'set-cosmos-config':
        try:
            os.mkdir(o['home'])
        except FileExistsError:
            pass
        fname = cosmosConfigFile(o['home'])
        print('Reading %s from stdin; hit Ctrl-D to finish' % fname)
        cfgJson = sys.stdin.read()
        with open(fname, 'w') as f:
            f.write(cfgJson)
    elif o.subCommand == 'add-pubkeys':
        # Now that we have our files, add all the accounts.
        f = open(cosmosConfigFile(o['home']), 'r')
        config = json.loads(f.read())
        try:
            f = open(pubkeyDatabase(o['home']))
            pkobjs_str = f.read().strip(', \r\n');
            pkobjs = json.loads('[' + pkobjs_str + ']')
        except FileNotFoundError:
            return
        pkobjs.reverse()
        react(doEnablePubkeys, ({**o, **o.subOptions}, config, pkobjs))
    elif o.subCommand == 'start':
        react(run_server, ({**o, **o.subOptions},))
    else:
        print("Need either 'set-cosmos-config' or 'start'")
        sys.exit(1)
