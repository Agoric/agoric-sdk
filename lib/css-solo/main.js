import { insist } from './insist';

// Start a network service
//const express = require('express');
//const WebSocket = require('ws');
//const morgan = require('morgan');
import fs from 'fs';
import path from 'path';
import initBasedir from './init-basedir';
import setGCIIngress from './set-gci-ingress';
//import start from './start';

function insistIsBasedir(basedir) {
  try {
    fs.statSync(path.join(basedir, 'solo-README.md'));
  } catch(e) {
    console.log(`Directory ${basedir} doesn't appear to be a css-solo base directory`);
  }
}

export default async function solo(argv) {
  console.log('solo', argv);

  if (argv[0] === 'init') {
    // TODO use a real argv parser, accept either ['--webport=8000'] or
    // ['--webport', '8000']. For now we only accept the latter.
    let webport = 8000;
    if (argv[1] === '--webport') {
      webport = Number(argv[2]);
      argv.splice(1,2);
    }
    const basedir = argv[1];
    insist(basedir !== undefined, 'you must provide a BASEDIR');
    initBasedir(basedir, webport);
  }

  else if (argv[0] === 'set-gci-ingress') {
    const basedir = fs.realpathSync('.');
    insistIsBasedir(basedir);
    const GCI = argv[1];
    const rpcAddresses = argv.slice(2);
    setGCIIngress(basedir, GCI, rpcAddresses);
  }

  else if (argv[0] === 'start') {
    const basedir = fs.realpathSync('.');
    insistIsBasedir(basedir);
    const withSES = true;
    start(basedir, withSES);
  }

  else {
    console.log(`unrecognized command ${argv[0]}`);
    console.log(`try one of: init, set-gci-ingress, start`);
  }

}
