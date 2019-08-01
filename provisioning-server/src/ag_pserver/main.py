from twisted.internet.task import react
from twisted.web import static, resource, server
from twisted.web.template import Element, XMLFile, renderer, flattenString
from twisted.internet import endpoints, defer, protocol
from twisted.python import usage
import wormhole
import treq
import os.path
import os
import json

from twisted.python import log
import sys
log.startLogging(sys.stdout)

# TODO: Don't hardcode these.
INITIAL_TOKEN = '1agmedallion'
AG_BOOTSTRAP_PASSWORD = b'mmmmmmmm'

MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
#MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"

htmldir = os.path.join(os.path.dirname(__file__), "html")

class SetConfigOptions(usage.Options):
    pass

class StartOptions(usage.Options):
    optParameters = [
        ["mountpoint", "m", "/", "controller's top level web page"],
        ["listen", "l", "tcp:8001", "client-visible HTTP listening port"],
        ["controller", "c", "http://localhost:8002/vat", "controller's listening port for us to send control messages"],
    ]

class Options(usage.Options):
    subCommands = [
        ['set-cosmos-config', None, SetConfigOptions, "Pipe output of 'ag-setup-cosmos show-config' to this command"],
        ['start', None, StartOptions, 'Start the HTTP server'],
        ]
    optParameters = [
        ["home", None, os.environ["HOME"] + '/.ag-pserver', "provisioning-server's state directory"],
        ]

class SendInputAndWaitProtocol(protocol.ProcessProtocol):
    def __init__(self, d, input):
        self.deferred = d
        self.input = input

    def connectionMade(self):
        self.transport.write(self.input)
        self.transport.closeStdin()
    
    def outReceived(self, data):
        print(str(data))

    def errReceived(self, data):
        print(str(data), file=sys.stderr)
    
    def processEnded(self, reason):
        self.deferred.callback(reason.value.exitCode)

def cosmosConfigFile(home):
    return home + '/cosmos-chain.json';

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
        args = ConfigElement.gatherArgs(self.opts)
        html = yield flattenString(None, ConfigElement(*args))
        defer.returnValue(html)

    def render_GET(self, req):
        d = self.build_page()
        def built(response):
            req.write(response)
            req.finish()
        d.addCallback(built)
        d.addErrback(log.err)
        return server.NOT_DONE_YET

class RequestCode(resource.Resource):
    def __init__(self, reactor, o):
        self.reactor = reactor
        self.opts = o

    @defer.inlineCallbacks
    def got_message(self, client_message, nickname):
        cm = json.loads(client_message.decode("utf-8"))
        mobj = {"type": "pleaseProvision",
                "nickname": nickname,
                "pubkey": cm["pubkey"],
                }
        print("mobj:", mobj)
        m = json.dumps(mobj)

        f = open(cosmosConfigFile(self.opts['home']))
        config = json.loads(f.read())

        # FIXME: Make more resilient to DOS attacks, or attempts
        # to drain all our agmedallions.
        if INITIAL_TOKEN is not None:
            d = defer.Deferred()
            processProtocol = SendInputAndWaitProtocol(d, AG_BOOTSTRAP_PASSWORD + b'\n')
            program = 'ag-cosmos-helper'
            self.reactor.spawnProcess(processProtocol, '/usr/local/bin/' + program, args=[
                program, 'tx', 'send', cm['pubkey'],
                INITIAL_TOKEN, '--from', config['bootstrapAddress'],
                '--yes', '--chain-id', config['chainName'],
                '--node',
                'tcp://' + config['rpcAddrs'][0], # TODO: rotate on failure
                '--home', os.environ['HOME'] + '/controller/ag-cosmos-helper-statedir',
                '--broadcast-mode', 'block' # Don't return until committed.
                ])
            code = yield d
            print('transfer of ' + INITIAL_TOKEN + ' returned ' + str(code))

        controller_url = self.opts["controller"]
        print('contacting ' + controller_url)
        # this HTTP request goes to the controller machine, where it should
        # be routed to vat-provisioning.js and the pleaseProvision() method.
        try:
            resp = yield treq.post(controller_url, m.encode('utf-8'),
                                   headers={b'Content-Type': [b'application/json']})
            if resp.code < 200 or resp.code >= 300:
                raise Exception('invalid response code ' + resp.code)
            rawResp = yield treq.json_content(resp)
        except Exception as e:
            print('controller error', e)
            return {"ok": False, "error": str(e)}
        if not rawResp.get("ok"):
            print("provisioning server error", rawResp)
            return {"ok": False, "error": rawResp.get('rej')}
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
        return server_message

    def send_provisioning_response(self, server_message, w):
        sm = json.dumps(server_message).encode("utf-8")
        print("send provisioning response", server_message)
        w.send_message(sm)
        d = w.close()
        d.addCallbacks(lambda _: print("provisioning complete"),
                       lambda f: print("provisioning error", f))

    @defer.inlineCallbacks
    def build_provisioning_response(self, nickname):
        w = wormhole.create(APPID, MAILBOX_URL, self.reactor)
        w.allocate_code()
        code = yield w.get_code()

        d = w.get_message()
        d.addCallback(self.got_message, nickname.decode('utf-8'))
        d.addCallback(self.send_provisioning_response, w)


        args = ConfigElement.gatherArgs(self.opts)
        html = yield flattenString(None, ResponseElement(code, nickname, *args))
        defer.returnValue(html)

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

    site = server.Site(root)
    s = endpoints.serverFromString(reactor, o["listen"])
    s.listen(site)
    print("server running")
    return defer.Deferred()

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
        f = open(fname, 'w')
        f.write(cfgJson)
        f.close()
    elif o.subCommand == 'start':
        react(run_server, ({**o, **o.subOptions},))
    else:
        print("Need either 'set-cosmos-config' or 'start'")
        sys.exit(1)
