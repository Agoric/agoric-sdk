from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import json

import os
import argparse

chain_id = ""
wallet = "" 
rpc = ""
data = ""

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_len = int(self.headers.get('Content-Length'))
            addr = self.rfile.read(content_len).decode("utf-8")
            print("sending funds to " + addr)
            subprocess.call(['sh', './scripts/send_funds.sh', addr, chain_id, wallet, rpc, data])
            self.send_response(200)
            self.end_headers()
        except Exception as e:
            print("failed " + str(e))
            os._exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('-c', '--chain-id')
    parser.add_argument('-d', '--chain-data')
    parser.add_argument('-a', '--faucet-address')
    parser.add_argument('-p', '--faucet-port', type=int)
    parser.add_argument('-r', '--rpc')
    parser.add_argument('-w', '--wallet')
    args = parser.parse_args()

    print(f'Connecting to {args.rpc}\n')
    print(f'Chain ID: {args.chain_id} Data: {args.chain_data} Wallet: {args.wallet}\n')
    print(f'Listening on {args.faucet_address}:{args.faucet_port}\n')

    chain_id = args.chain_id
    wallet = args.wallet 
    rpc = args.rpc
    data = args.chain_data

    print("starting faucet server...")

    # Serialize the args in to the server
    httpd = HTTPServer((args.faucet_address, args.faucet_port), SimpleHTTPRequestHandler)
    httpd.serve_forever()
