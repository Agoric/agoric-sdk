import path from 'path';
import http from 'http';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import djson from 'deterministic-json';
import { createHash } from 'crypto';
import connect from 'lotion-connect';

export async function connectToChain(basedir, GCI, rpcAddresses, myAddr, inbound) {
  //const connection = await connect(GCI, { nodes: [`ws://localhost:${rpcPort}`]});
  //makeChainFollower(connection, MYNAME, 'chain', inbound);

  // We spawn a long-running copy of 'ag-cosmos-helper', the
  // swingset-flavored cosmos-sdk CLI tool. We tell that process to listen on
  // its REST port, and then we make HTTP calls to that port. This is the
  // middle ground between our original hackish approach (shelling out to a
  // brand new copy of ag-cosmos-helper each time we wanted to send a
  // message) and the too-hard-to-do-right-this-instant less-hackish approach
  // (building an FFI binding to the same golang code that ag-cosmos-helper
  // uses, and calling it directly).

  // the 'ag-cosmos-helper' tool in our repo is built by 'make install' and
  // put into the user's $GOPATH/bin . That's a bit intrusive, ideally it
  // would live in the build tree along with bin/css-solo . But for now we
  // assume that 'ag-cosmos-helper' is on $PATH somewhere.

  if (rpcAddresses.length > 1) {
    // We want the rest server to rotate/failover between multiple supplied
    // ports, so we can give client nodes a list of validators to follow, and
    // any given validator can restart without clients failing, so 1: we need
    // to find out if the rest-server automatically reconnects, and 2: we
    // need to spin up multiple rest-servers (one per rpcAddress) if they
    // can't do the multiple-server thing themselves.
    console.log('NOTE: multiple rpc ports provided, but I can only use one right now');
  }

  // the rest-server defaults to '--laddr tcp://localhost:1317' , but it
  // might behoove us to allocate a new port so we don't collide with
  // anything else on the box (we generally avoid relying on default ports)

  // TODO: --chain-id matches something in the genesis block, should we
  // include it in the arguments to `css-solo set-gci-ingress`? It's included
  // in the GCI, but if we also need it to establish an RPC connection, then
  // it needs to be learned somehow, rather than being hardcoded.

  const serverDir = path.join(basedir, 'ag-cosmos-helper-statedir');

  const args = [ 'rest-server',
                 '--node', rpcAddresses[0],
                 '--chain-id', 'agchain',
                 '--output', 'json',
                 '--trust-node', 'false',
                 '--home', serverDir,
               ];

  const p = spawn('ag-cosmos-helper', args);
  p.stdout.on('data', _data => 'ignored');
  //p.stdout.on('data', data => console.log(`ag-cosmos-helper rest-server stdout: ${data}`));
  p.stderr.on('data', data => console.log(`ag-cosmos-helper rest-server stderr: ${data}`));
  p.on('close', code => console.log(`ag-cosmos-helper rest-server exited with ${code}`));
  console.log(`started ag-cosmos-helper rest-server`);

  const restURL = `http://localhost:1317`;
  const mailboxURL = `${restURL}/swingset/mailbox/${myAddr}`;

  function getMailbox() {
    return fetch(mailboxURL)
      .then(res => res.json()) // .json() returns a Promise
      .then(r => {
        if (!r.value) {
          console.log(`no value in getMailbox query, got`, r);
          // error is probably r.codespace/r.code, with human-readable
          // r.message
        }
        return JSON.parse(r.value);
      });
  }

  getMailbox().then(m => console.log(`mailbox is`, m));

  const rpcURL = `http://${rpcAddresses[0]}`;
  const rpcWSURL = `ws://${rpcAddresses[0]}`;
  function getGenesis() {
    return fetch(`${rpcURL}/genesis`)
      .then(res => res.json())
      .then(json => json.result.genesis);
  }

  /*
  getGenesis().then(g => console.log(`genesis is`, g));
  getGenesis().then(g => {
    const gci = createHash('sha256').update(djson.stringify(g)).digest('hex');
    console.log(`computed GCI is ${gci}`);
  });
  */

  // TODO: decide on a single place to perform the light-client checks. The
  // 'tendermint' package can do this (instantiate Tendermint() with a
  // known-valid starting state, containing {header,validators,commit}, which
  // can be fetched by RPC, and maybe the validators can be extracted from
  // the genesis block, which we can compare against the GCI). The
  // 'ag-cosmos-helper' tool might do it. We need one subscription-type thing
  // to tell us that a new block exists, then we can use a different
  // query-type tool to retrieve the outbox, but we want to know that the
  // outbox is correctly traced to the block header, and that the block
  // header is a legitimate descendant of our previously-validated state.

  // we use a small piece (connect-by-address.js) of lotion-connect to do
  // this; we could get away with fewer dependencies by rewriting just that
  // part.

  // we could also do connect(undefined, { genesis, nodes })
  const c = await connect(GCI, { nodes: [rpcWSURL] });

  // TODO: another way to make this cheaper would be to extract the apphash
  // from the received block, and only check the mailbox if it changes.
  // That's more coarse than checking for only our own slot, but better than
  // hitting the rest-server on every single block.

  c.lightClient.on('update', _a => {
    console.log(`new block on ${GCI}, fetching mailbox`);
    getMailbox().then(m => {
      const [outbox, ack] = m;
      inbound(GCI, outbox, ack);
    });
  });

  async function deliver(newMessages, acknum) {
    // each message must include { account_number, sequence } for
    // ordering/replay protection. These must be learned from the chain (from
    // the 'auth' module, which manages accounts, which are indexed by
    // address even though the messages contain an account_number). The
    // 'account_number' is (I'd hope) static, so we could fetch it once at
    // startup. The 'sequence' number increase with each txn, and we're the
    // only party with this private key, so we could also fetch it once at
    // startup (or remember it in our local state) and just increment it with
    // each message. For now we stay lazy and fetch it every time.
    console.log(`delivering to chain`, GCI, newMessages, acknum);

    const accountURL = `${restURL}/auth/accounts/${myAddr}`;
    console.log(`accountURL is ${accountURL}`);
    const ans = await fetch(accountURL)
          .then(r => {
            console.log(`r is`, r);
            if (r.status === 204) {
              throw new Error(`account query returned empty body: the chain doesn't know us`);
            }
            return r.json();
          })
          .then(a => {
            return { account_number: a.value.account_number,
                     sequence: a.value.sequence,
                   };
          },
               err => {
                 console.log(`error in .json`, err);
                 throw err;
               });
    console.log(`account_ans:`, ans);

    const url = `${restURL}/swingset/mailbox`;
    const body = {
      base_req: {
        chain_id: 'agchain',
        from: myAddr,
        sequence: ans.sequence,
        account_number: ans.account_number,
        password: 'mmmmmmmm',
      },
      peer: myAddr, // TODO: combine peer and submitter in the message format?
      submitter: myAddr,
      // TODO: remove this JSON.stringify change 'deliverMailboxReq' to have
      // more structure than a single string
      deliver: JSON.stringify([newMessages, acknum]),
    };
    return fetch(url, { method: 'POST',
                        body: JSON.stringify(body),
                        //headers: { 'Content-Type': 'application/json' } // do we need it?
                      })
      .then(res => res.json())
      .then(json => {
        console.log(`POST done`, JSON.stringify(json));
      });

  }

  return deliver;
}
