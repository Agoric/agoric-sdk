from twisted.internet.task import react
from twisted.web import static, resource, server
from twisted.internet import endpoints, defer
from twisted.python import usage
import wormhole
import treq
import os.path
import json

from twisted.python import log
import sys
log.startLogging(sys.stdout)

#MAILBOX_URL = u"ws://relay.magic-wormhole.io:4000/v1"
MAILBOX_URL = u"ws://10.0.2.24:4000/v1"
APPID = u"agoric.com/ag-testnet1/provisioning-tool"

htmldir = os.path.join(os.path.dirname(__file__), "html")


class Options(usage.Options):
    optParameters = [
        ["listen", "l", "tcp:8001", "client-visible HTTP listening port"],
        ["controller", "c", "tcp:localhost:8002", "controller's listening port for us to send control messages"],
        ]

class RequestCode(resource.Resource):
    def __init__(self, reactor):
        self.reactor = reactor

    def got_message(self, client_message, w):
        cm = json.loads(client_message.decode("utf-8"))
        print("pubkey:", cm["pubkey"])
        server_message = {
            "GCI": "chain GCI",
            "rpcPorts": ["host1:port1", "host2:port2"],
            "ingressIndex": 1,
            }
        sm = json.dumps(server_message).encode("utf-8")
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
        d.addCallback(self.got_message, w)

        with open(os.path.join(htmldir, "response-template.html")) as f:
            template = f.read()
        template = template.replace("$$$CODE$$$", code)
        defer.returnValue(template.encode("utf-8"))

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
    root.putChild(b"request-code", RequestCode(reactor))
    site = server.Site(root)
    s = endpoints.serverFromString(reactor, o["listen"])
    s.listen(site)
    print("server running")
    return defer.Deferred()

def main():
    o = Options()
    o.parseOptions()
    react(run_server, (o,))
