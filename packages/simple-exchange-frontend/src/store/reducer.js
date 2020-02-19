function randomBoolean() {
  return Math.random < 0.5;
}

function randomArrayItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInteger(max) {
  return Math.floor(Math.random() * max);
}

function randomName(max) {
  const result = [];
  const items = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const { length } = items;
  for (let i = 0; i < max; i += 1) {
    result.push(items.charAt(Math.floor(Math.random() * length)));
  }
  return result.join('');
}

function createFakeOrderBook(count) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push({
      id: i,
      side: randomArrayItem(['Buy', 'Sell']),
      size: randomInteger(1000),
      filled: randomInteger(1000),
      my_size: randomBoolean() ? randomInteger(1000) : undefined,
    });
  }
  return result;
}

function createFakeOrderHistory(count) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push({
      id: i,
      side: randomArrayItem(['Buy', 'Sell']),
      size: randomInteger(1000),
      filled: randomInteger(1000),
      status: randomArrayItem(['Open', 'Filled']),
    });
  }
  return result;
}

function createFakePurses(count) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push({
      id: i,
      purseName: randomName(3),
      assayId: randomArrayItem(['Moolah', 'Simoleon']),
      extent: randomInteger(1000),
    });
  }
  return result;
}

export function createDefaultState() {
  return {
    active: false,
    connected: false,
    orderbook: createFakeOrderBook(100),
    orderhistory: createFakeOrderHistory(50),
    purses: createFakePurses(3),
  };
}

export const reducer = (state, { type, _payload }) => {
  switch (type) {
    default:
      throw new TypeError(`Action not supported ${type}`);
  }
};
