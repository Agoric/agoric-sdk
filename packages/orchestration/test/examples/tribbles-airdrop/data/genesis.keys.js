import '@endo/init';
import { merkleTreeAPI } from '../../../../src/examples/airdrop/merkle-tree/index.js';

const agoricGenesisAccounts = [
  {
    name: 'faucet',
    type: 'local',
    address: 'agoric1hm54wrxsv8e3pnw6lxj5lssfpexn48xtj6fhxw',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ApbVlMcmEODtsa0hKbQDdfP6yDCVDtNsHfa0eJDYUlMm',
    },
  },
  {
    name: 'genesis',
    type: 'local',
    address: 'agoric19rplwp8y7kclys6rc5mc6pc9t393m9swzmdjtx',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AypaDjnPmDIfxBX2Tt6UQjeQq0ndaG5rQDbD4GLmwUQ5',
    },
  },
  {
    name: 'relayer-cli-1',
    type: 'local',
    address: 'agoric1r4gpq0tyg8jdm9mleq47f7k569yhyfnrx3p6da',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiVRzInOYZGPadFqE1fmybdO+lxt728mOODUT+iCUIpW',
    },
  },
  {
    name: 'relayer-cli-2',
    type: 'local',
    address: 'agoric14edd8dcj4gm0rjzkfeuxyxmjtewfz8cwu6hc99',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ay1a99eE/NDlBCfltOBZJf5FEjJd7od3XRPykbdHOFj6',
    },
  },
  {
    name: 'relayer-cli-3',
    type: 'local',
    address: 'agoric177ttev07yagvyr4jmy94wnwma5nm2ctvj076g5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ah1d0p817qdFQizepUhcj5wkhdDl8BkBoEpg0aFDy+dz',
    },
  },
  {
    name: 'relayer-cli-4',
    type: 'local',
    address: 'agoric1znrgxra5f9evjyuk5tkwttgdeakevp2ahlm3nv',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8Gv8NXPOTgFWpTv2MSX76Xl9sZE+65bvRceRZbphpQv',
    },
  },
  {
    name: 'relayer1',
    type: 'local',
    address: 'agoric13pwxrtsdusljz8wc4j2wjec009cm0p38zr58hn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ap81RxuzlZbd5+3ybmq+8sl3Iv1VXjJZPr1be+biVRg/',
    },
  },
  {
    name: 'relayer2',
    type: 'local',
    address: 'agoric1y73xu9wt3xm93wkk3d3ew0xwvhqmyu6gy82t9x',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ap7zXOumBCVg3Yf2carRdTbXFn2h/UGE2QlJzshomwpe',
    },
  },
  {
    name: 'relayer3',
    type: 'local',
    address: 'agoric1v97d7sgng3nke5fvdsjt5cwhu2tj0l3l3cqh30',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aj5lolSVU/bw+e3kdMyQclfHpxO8E5kIU8o1XKJ8JjNO',
    },
  },
  {
    name: 'relayer4',
    type: 'local',
    address: 'agoric1xry4gpu5e63yv9f0v2p7huu767g5jm84e82t2m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ay1/r8XmHU6cXNnRHaxu5QP4Z2kWfIi11ZUNbKQhnd5l',
    },
  },
  {
    name: 'test1',
    type: 'local',
    address: 'agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4PYpxsDLiygz7aqiBfjl8IpuSqmKHEg3Vf9r2EPXN1A',
    },
  },
  {
    name: 'tg',
    type: 'local',
    address: 'agoric1jng25adrtpl53eh50q7fch34e0vn4g72j6zcml',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Axn3Bies1P2bVzvRc23udrmny6YAXxH1o8NYpf3tDnR5',
    },
  },
];

const getPubkey = ({ pubkey: { key } }) => key;

const pubkeys = agoricGenesisAccounts.map(getPubkey);
merkleTreeAPI.generateMerkleRoot(pubkeys);
export { agoricGenesisAccounts, pubkeys };
