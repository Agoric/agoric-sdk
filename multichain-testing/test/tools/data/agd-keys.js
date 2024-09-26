const accounts = [
  {
    tier: 1,
    name: 'gov1',
    type: 'local',
    address: 'agoric1aa9jh3am8l94kawqy8003999ekk8dksdmwdemy',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AlGGU+FJgSGdwXjG2tGmza5UFYQhoeWBlTzFK8YSk6nM',
    },
  },
  {
    tier: 4,
    name: 'gov2',
    type: 'local',
    address: 'agoric15r9kesuumyfdjtuj5pvulmt6tgr0uqz82yhk84',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A98CowubQ7ui4BO++4NFvf4NxxjkQGAUo8787y3ipa06',
    },
  },
  {
    tier: 1,
    name: 'gov3',
    type: 'local',
    address: 'agoric1h3jpwr2tawcc4ahlez45qepy5mnwdnlps55xvr',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'ArcFg4+WNp7wpD8PlgOwB1gRIvuN9tkOz5S2yskZsTtp',
    },
  },
  {
    tier: 4,
    name: 'may11',
    type: 'local',
    address: 'agoric1g6lrpj3wtdrdlsakxky4rhnzfkep23vgfk9esp',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Ar+zTmVnp1l696gMJZZ2nF9tV4l75beK2hchMmki+DL0',
    },
  },
  {
    tier: 2,
    name: 'owens-key',
    type: 'local',
    address: 'agoric18tdsgyamdkcs0lkf885gp3v5slq3q5n455lett',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+tCAk6BFice/hlHWQaGT1P9wb2A5Nl6vCzATqM4xCip',
    },
  },
  {
    tier: 3,
    name: 'test-may-11',
    type: 'local',
    address: 'agoric1p6fp3zj9er8h47r3yndysd9k7ew7es8kjlffus',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AwuJqq2wUhIY2MlLew4JPbUH97tSBTiTJ+59M5TRLqi5',
    },
  },
  {
    tier: 1,
    name: 'tg',
    type: 'local',
    address: 'agoric1ly74z376l5fwrr5z26n4pfns7qllraq2nwwfgr',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AqOKu/JGhihnbWO0e9OipfgNLWg4mUsZyP/LCsGonj+C',
    },
  },
  {
    tier: 2,
    name: 'user1',
    type: 'local',
    address: 'agoric1xe269y3fhye8nrlduf826wgn499y6wmnv32tw5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4owcrbL34M4lCDua/zhpampsPRJHu5zKp9gc/u8c1YH',
    },
  },
  {
    tier: 1,
    name: 'tg-oracle',
    type: 'local',
    address: 'agoric1we6knu9ukr8szlrmd3229jlmengng9j68zd355',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AiFAg1ZqtHo7WoheNUAJEScqSLuQCiv7umfToaNjaEv1',
    },
  },
  {
    tier: 2,
    name: 'tg-test',
    type: 'local',
    address: 'agoric1d3pmtdzem9a8fqe8vkfswdwnuy9hcwjmhlh4zz',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A5A20phWctpT88lD+jbXxdA06llfvXd0aq3BnkRozDg8',
    },
  },
  {
    tier: 1,
    name: 'tgrex',
    type: 'local',
    address: 'agoric1zqhk63e5maeqjv4rgcl7lk2gdghqq5w60hhhdm',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'AybVHbbXgexk5dz+RWfch+2a1rCS5IYl5vSJF9l/qE48',
    },
  },
  {
    tier: 1,
    name: 'u1',
    type: 'local',
    address: 'agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Anc5HuzkD5coFkPWAgC87lGbfC+SdzCPwRpOajFrGYSZ',
    },
  },
  {
    tier: 5,
    name: 'user1',
    type: 'local',
    address: 'agoric1xe269y3fhye8nrlduf826wgn499y6wmnv32tw5',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A4owcrbL34M4lCDua/zhpampsPRJHu5zKp9gc/u8c1YH',
    },
  },
  {
    tier: 4,
    name: 'user2local',
    type: 'local',
    address: 'agoric1ahsjklvps67a0y7wj0hqs0ekp55hxayppdw5az',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'Anqep1Y/ZxRDMbiZ3ng03JmX3qyTl77x4OnXylI7w46b',
    },
  },
  {
    tier: 1,
    name: 'victor-da-best',
    type: 'local',
    address: 'agoric1vzqqm5dfdhlxh6n3pgkyp5z5thljklq3l02kug',
    pubkey: {
      type: '/cosmos.crypto.secp256k1.PubKey',
      key: 'A+Si8+03Q85NQUAsvhW999q8Xw0fON08k3i6iZXg3S7/',
    },
  },
];

const getPubkeyKey = ({ pubkey }) => `${pubkey.key}`;
const agoricPubkeys = accounts.map(getPubkeyKey);

export { accounts, agoricPubkeys };
