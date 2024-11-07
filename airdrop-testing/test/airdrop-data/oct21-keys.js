import '@endo/init';
import { merkleTreeAPI } from './merkle-tree/index.js';
import ONE_THOUSAND_AND_ELEVEN_KEYS from './ONE_THOUSAND_AND_ELEVEN_KEYS.js';

const pubkeys = ONE_THOUSAND_AND_ELEVEN_KEYS.map(x => x.pubkey.key);

const addresses = [
  'agoric1hm54wrxsv8e3pnw6lxj5lssfpexn48xtj6fhxw',
  'agoric19rplwp8y7kclys6rc5mc6pc9t393m9swzmdjtx',
  'agoric1r4gpq0tyg8jdm9mleq47f7k569yhyfnrx3p6da',
  'agoric14edd8dcj4gm0rjzkfeuxyxmjtewfz8cwu6hc99',
  'agoric177ttev07yagvyr4jmy94wnwma5nm2ctvj076g5',
  'agoric1znrgxra5f9evjyuk5tkwttgdeakevp2ahlm3nv',
  'agoric13pwxrtsdusljz8wc4j2wjec009cm0p38zr58hn',
  'agoric1y73xu9wt3xm93wkk3d3ew0xwvhqmyu6gy82t9x',
  'agoric1v97d7sgng3nke5fvdsjt5cwhu2tj0l3l3cqh30',
  'agoric1xry4gpu5e63yv9f0v2p7huu767g5jm84e82t2m',
  'agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx',
  'agoric1jvp558cwedux4cjtam50z9x6sjv8tcug7fdjdm',
  'agoric15sjwdw66h88uwaaj8sca77as3lv0vqp7lv2kxm',
  'agoric1t3cuvgrlljst5pumkvsxnqs0l2xvwptgxrzn7j',
  'agoric1gtnf9pja6ydna4vlxuxyxx3dgna34tcslskjwc',
  'agoric1xpysssmhy3hgfeuf3vm8zm5jwndh6520przeah',
  'agoric1kdffyewve409d5l4gptzcm49ck32gvq8jx0lht',
  'agoric1t0uz9u8tx2jx5xwjh73hg4h40eucuyrrdqxm6s',
  'agoric1f2078clgw3vv6r75ew3gxg4gsspqlxrucpvyqd',
  'agoric1javznxm0rwu99ghg4q5nvmn268qgwa3zal09vz',
  'agoric1lnm0n77ct9gzls99n95zh8z8frzrz2gk5ygzc2',
  'agoric1pcqjr609e62eqwfcue5p03efxg4e3xegcny06p',
  'agoric1ll6q23vkwwl9rz24wudhwl35f32n3f3laac599',
  'agoric1rwajmzrptnq6qxgsjdkd9tgacare88xtmerpm8',
  'agoric1t896yyduypytrx9lnqwx4s48ecnqeznm8ecld2',
  'agoric1h6a8guwqpde2qk0025mdznl8zsuxyp9a32zmqn',
  'agoric15llswhrq98r2caq6fe3us4a26rujpfh7m6wutq',
  'agoric1c6jwtll8pr4cv22fnj5hc88u83z6py5x8cypr9',
  'agoric1wwfrcr84huyaq3d9sld8yngywyqlqx2qx0mkhg',
  'agoric1t3lh8updxpatwjugqpzqv2eyjwc5xxzxmq7l0m',
];
const accountsArray = [
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
    name: 'user_0',
    type: 'local',
    address: 'agoric1jvp558cwedux4cjtam50z9x6sjv8tcug7fdjdm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1Dt/esAkHw/zHhzDOV5rfiYwWqsyzLT2jbr7f8AElvF',
    },
  },
  {
    name: 'user_1',
    type: 'local',
    address: 'agoric15sjwdw66h88uwaaj8sca77as3lv0vqp7lv2kxm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0Z0P7Q+JJQs3qGuzPmm8T2itIFg9UzPbYVYQ882SicP',
    },
  },
  {
    name: 'user_10',
    type: 'local',
    address: 'agoric1t3cuvgrlljst5pumkvsxnqs0l2xvwptgxrzn7j',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A85P8+rSMGcgt/yYeveadJI8YCNAxZ19dJ3z9OBKBrOK',
    },
  },
  {
    name: 'user_11',
    type: 'local',
    address: 'agoric1gtnf9pja6ydna4vlxuxyxx3dgna34tcslskjwc',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ag/IgBMYN75jLAB6/8MEQDg4zbI+WrlPG4uX622eM6vE',
    },
  },
  {
    name: 'user_12',
    type: 'local',
    address: 'agoric1xpysssmhy3hgfeuf3vm8zm5jwndh6520przeah',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aj+nHQ0jH3ZTwFUJvTS+yMzRfyYG2UtuYC4G5xw2OiMh',
    },
  },
  {
    name: 'user_13',
    type: 'local',
    address: 'agoric1kdffyewve409d5l4gptzcm49ck32gvq8jx0lht',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvOcE8S0uhKjtJX0fZfwxxuVtkG3YHNY9Uzf0RUHeJsN',
    },
  },
  {
    name: 'user_14',
    type: 'local',
    address: 'agoric1t0uz9u8tx2jx5xwjh73hg4h40eucuyrrdqxm6s',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsRGyNguPIlpUL9B/b4yG9IgumNTsmHt/tFGeJeXzq+/',
    },
  },
  {
    name: 'user_15',
    type: 'local',
    address: 'agoric1f2078clgw3vv6r75ew3gxg4gsspqlxrucpvyqd',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ar9685yscOGUj//HvVJXDGoEX5vFQrmPRuwz60fWB9Cb',
    },
  },
  {
    name: 'user_16',
    type: 'local',
    address: 'agoric1javznxm0rwu99ghg4q5nvmn268qgwa3zal09vz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Axw1peKnnWXhi/amZPgxOxi9/QlKwonfkExN27fULyw2',
    },
  },
  {
    name: 'user_18',
    type: 'local',
    address: 'agoric1lnm0n77ct9gzls99n95zh8z8frzrz2gk5ygzc2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkyqcBYJpHpExqhGXQZQz9kPaspCoQJP/zk18tpcnI3d',
    },
  },
  {
    name: 'user_19',
    type: 'local',
    address: 'agoric1pcqjr609e62eqwfcue5p03efxg4e3xegcny06p',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AzHpHNlE8rq6QbTxG792S/oVU/HWZLmIeFs8KLkmOLuK',
    },
  },
  {
    name: 'user_2',
    type: 'local',
    address: 'agoric1ll6q23vkwwl9rz24wudhwl35f32n3f3laac599',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A03XFUOExKyz4umCo21O1azAtWEH7KeQlVtmpn/9LM5k',
    },
  },
  {
    name: 'user_3',
    type: 'local',
    address: 'agoric1rwajmzrptnq6qxgsjdkd9tgacare88xtmerpm8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvSVLqQv5kD3qDvLOhk52FdXJ4DW4mXtdnwjYN8VnOc9',
    },
  },
  {
    name: 'user_4',
    type: 'local',
    address: 'agoric1t896yyduypytrx9lnqwx4s48ecnqeznm8ecld2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Al9pyfqu3/65mGty5Y4iUV/waKVh0E9LpzpcOCIqaJf9',
    },
  },
  {
    name: 'user_5',
    type: 'local',
    address: 'agoric1h6a8guwqpde2qk0025mdznl8zsuxyp9a32zmqn',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A67IBziMdmS4S6vmf4ZB0rbeKQ09PxRyArzvlEjXPuio',
    },
  },
  {
    name: 'user_6',
    type: 'local',
    address: 'agoric15llswhrq98r2caq6fe3us4a26rujpfh7m6wutq',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AzOr7eHbt3cYy977mlXzqYaFQZ0qjsp/e1HqYLbA2I/j',
    },
  },
  {
    name: 'user_7',
    type: 'local',
    address: 'agoric1c6jwtll8pr4cv22fnj5hc88u83z6py5x8cypr9',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9IsS0Phutp4gFZbsUN/aNny+0tHN+IsV++uwPJWgjYw',
    },
  },
  {
    name: 'user_8',
    type: 'local',
    address: 'agoric1wwfrcr84huyaq3d9sld8yngywyqlqx2qx0mkhg',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8OJpG8rsazyQ+DVy7BsWyJhLVkWhtc5PAXLQN5Z/8Ex',
    },
  },
  {
    name: 'user_9',
    type: 'local',
    address: 'agoric1t3lh8updxpatwjugqpzqv2eyjwc5xxzxmq7l0m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AypT4PwxmA3Brvgg6djyVMsVD5lEGGh63FvEg0zv8JjS',
    },
  },
];

const makeMerkleTreeFacet = (keys = [], accounts = accountsArray) => ({
  getEligibleAccounts: () => accounts,
  eligibleAccounts: accounts,
  keys,
  getAccount(address) {
    return this.eligibleAccounts.filter(x => x.address === address)[0];
  },
  root: merkleTreeAPI.generateMerkleRoot(keys),
  getProof: ({ pubkey: { key } }) => {
    console.log('getting prooof for pubkey', key);
    const proof = merkleTreeAPI.generateMerkleProof(key, keys);
    console.log('------------------------');
    console.log('proof::', proof);
    return proof;
  },
  getRootAndCompare(proof) {
    return this.root === merkleTreeAPI.getMerkleRootFromMerkleProof(proof);
  },
});

const merkleObject = makeMerkleTreeFacet(pubkeys, accountsArray);

export {
  makeMerkleTreeFacet,
  merkleObject as defaultMerkleObject,
  addresses,
  accountsArray,
};

console.log('merkleRoot:::', merkleObject.root);
// merkleObject.getRootAndCompare(exampleProof)
export default pubkeys;
