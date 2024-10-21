import { merkleTreeAPI } from './merkle-tree/index.js';

const accounts = [
  {
    name: 'a',
    type: 'local',
    address: 'agoric102wlz36fz5dsxl2hcmd86xdc4s4hpq3h56anyk',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Arwp24Pp8UzEQrgkYfsVulTdV8Mx76til/NEtY66RxE5',
    },
  },
  {
    name: 'alice',
    type: 'local',
    address: 'agoric1auqhdx5qg0zy0zr5mkycjhlrpzt53z0kn3q803',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+juedVIxy8w21h7XcOGaWtfTXViK28Z3pSRWTeNdgn9',
    },
  },
  {
    name: 'b',
    type: 'local',
    address: 'agoric1znuhyn75mp47va0dzgff8rwywwa5u3wc5d9z62',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoLKj+PgZfJDDLZ/jc4j6fjcUdjnqB4Z703xck6XRjZq',
    },
  },
  {
    name: 'bob',
    type: 'local',
    address: 'agoric1ahkmamglsyzfukhd0xcpvyrudwx6y2g8sdq5gu',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0OhkBJwx/KRyrZXxf8K7aRm/lqXoAmIklXIZvUqK6SE',
    },
  },
  {
    name: 'c',
    type: 'local',
    address: 'agoric1qd8u5lqw9v9zfjrhtx84p7lkallgtdwyqz8v2g',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5hAe5rMXfEov5W1/MXRRgwZJIDfVupOA2xlrwiuR85P',
    },
  },
  {
    name: 'carol',
    type: 'local',
    address: 'agoric1k4q9xes839xwg8nhup7rutshdd2wps6yrkm5au',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ay+ZPBMJlFTe2Uhaetj/oMZmTGz/E9Ns5vusk5zuYBxh',
    },
  },
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
    name: 'fortyeth',
    type: 'local',
    address: 'agoric1y5f4zcp8masy08grcm9f7fxl3fl96t3xvvhlyt',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AoAaApzhamkkHjnAlEPzpoiBaDFpo5xh2cexMVm7bE7O',
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
    name: 'recipient-d',
    type: 'local',
    address: 'agoric1pcqjr609e62eqwfcue5p03efxg4e3xegcny06p',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AzHpHNlE8rq6QbTxG792S/oVU/HWZLmIeFs8KLkmOLuK',
    },
  },
  {
    name: 'recipient-e',
    type: 'local',
    address: 'agoric1lnm0n77ct9gzls99n95zh8z8frzrz2gk5ygzc2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AkyqcBYJpHpExqhGXQZQz9kPaspCoQJP/zk18tpcnI3d',
    },
  },
  {
    name: 'recipient-f',
    type: 'local',
    address: 'agoric1javznxm0rwu99ghg4q5nvmn268qgwa3zal09vz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Axw1peKnnWXhi/amZPgxOxi9/QlKwonfkExN27fULyw2',
    },
  },
  {
    name: 'recipient-g',
    type: 'local',
    address: 'agoric1f2078clgw3vv6r75ew3gxg4gsspqlxrucpvyqd',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ar9685yscOGUj//HvVJXDGoEX5vFQrmPRuwz60fWB9Cb',
    },
  },
  {
    name: 'recipient-h',
    type: 'local',
    address: 'agoric1wwfrcr84huyaq3d9sld8yngywyqlqx2qx0mkhg',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A8OJpG8rsazyQ+DVy7BsWyJhLVkWhtc5PAXLQN5Z/8Ex',
    },
  },
  {
    name: 'recipient-i',
    type: 'local',
    address: 'agoric1kdffyewve409d5l4gptzcm49ck32gvq8jx0lht',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvOcE8S0uhKjtJX0fZfwxxuVtkG3YHNY9Uzf0RUHeJsN',
    },
  },
  {
    name: 'recipient-j',
    type: 'local',
    address: 'agoric1xpysssmhy3hgfeuf3vm8zm5jwndh6520przeah',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Aj+nHQ0jH3ZTwFUJvTS+yMzRfyYG2UtuYC4G5xw2OiMh',
    },
  },
  {
    name: 'recipient-k',
    type: 'local',
    address: 'agoric1gtnf9pja6ydna4vlxuxyxx3dgna34tcslskjwc',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ag/IgBMYN75jLAB6/8MEQDg4zbI+WrlPG4uX622eM6vE',
    },
  },
  {
    name: 'recipient-l',
    type: 'local',
    address: 'agoric1t3cuvgrlljst5pumkvsxnqs0l2xvwptgxrzn7j',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A85P8+rSMGcgt/yYeveadJI8YCNAxZ19dJ3z9OBKBrOK',
    },
  },
  {
    name: 'recipient-m',
    type: 'local',
    address: 'agoric1t3lh8updxpatwjugqpzqv2eyjwc5xxzxmq7l0m',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AypT4PwxmA3Brvgg6djyVMsVD5lEGGh63FvEg0zv8JjS',
    },
  },
  {
    name: 'recipient-n',
    type: 'local',
    address: 'agoric1jvp558cwedux4cjtam50z9x6sjv8tcug7fdjdm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1Dt/esAkHw/zHhzDOV5rfiYwWqsyzLT2jbr7f8AElvF',
    },
  },
  {
    name: 'recipient-o',
    type: 'local',
    address: 'agoric15sjwdw66h88uwaaj8sca77as3lv0vqp7lv2kxm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A0Z0P7Q+JJQs3qGuzPmm8T2itIFg9UzPbYVYQ882SicP',
    },
  },
  {
    name: 'recipient-p',
    type: 'local',
    address: 'agoric1ll6q23vkwwl9rz24wudhwl35f32n3f3laac599',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A03XFUOExKyz4umCo21O1azAtWEH7KeQlVtmpn/9LM5k',
    },
  },
  {
    name: 'recipient-q',
    type: 'local',
    address: 'agoric1rwajmzrptnq6qxgsjdkd9tgacare88xtmerpm8',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AvSVLqQv5kD3qDvLOhk52FdXJ4DW4mXtdnwjYN8VnOc9',
    },
  },
  {
    name: 'recipient-r',
    type: 'local',
    address: 'agoric1t896yyduypytrx9lnqwx4s48ecnqeznm8ecld2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Al9pyfqu3/65mGty5Y4iUV/waKVh0E9LpzpcOCIqaJf9',
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
    name: 'thirtyeightth',
    type: 'local',
    address: 'agoric1zdnwgsr0ve9qv0lzufenmtyzm433s88naxs357',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AsOFJPvWNhRMV6nyqlwIxCDedNm/TvF8WbfDBasrUGZ4',
    },
  },
  {
    name: 'thirtyfifth',
    type: 'local',
    address: 'agoric1h7zae3f8nkxgvfz2nynvk2ft87edgskcdy5k07',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Avye5HM+C5LdQwzk0M56x5c2WKK5XJO6oUejIHPd/IBI',
    },
  },
  {
    name: 'thirtyfourth',
    type: 'local',
    address: 'agoric1uj3pp0azrvfpxtjku3haphr4xzfluk0kztaaux',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A6Ku5kQtIzhBzcKfIW/wkavCFDWg40mIiHFBQpTCn44a',
    },
  },
  {
    name: 'thirtynineth',
    type: 'local',
    address: 'agoric1xjfet966sfd84lqqfdyhrgw4euun783r9p43hs',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A9C5r1MXx/ZOShC5qUoQwcA3laST1pbqVStAtx93mh+B',
    },
  },
  {
    name: 'thirtyseventh',
    type: 'local',
    address: 'agoric1vvm4lf839023t4km30xs6am4k7vwxkaj3d4mn2',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A1T+uY8FyUzMUsQHV7BtQEpyP7edaMS5Nq6pqA/XQfjt',
    },
  },
  {
    name: 'thirtysixth',
    type: 'local',
    address: 'agoric1kpd6v8nmt4mh0j5jpmm7z66cs8qhv7yw4f5lad',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AuCvGaWiLINetjfa7pf7qdRhE5dKSzcfzFkI/Ug6fE8b',
    },
  },
  {
    name: 'thirtythird',
    type: 'local',
    address: 'agoric1m22hl7m7edcyufsdmf7vycdcqqfwdlsgjx20gu',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AhCQQMeonVLEoJn9BqWrSmEfl0HCJhwvqSium+UtVB+Y',
    },
  },
];

const getPubkey = ({ pubkey }) => pubkey.key;
const keys = accounts.map(getPubkey);
const root = merkleTreeAPI.generateMerkleRoot(keys); //?

export { accounts, keys, root };
