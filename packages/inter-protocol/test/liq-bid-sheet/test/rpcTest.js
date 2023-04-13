const testWithCache = async () => {
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const rpc = doc.getRangeByName('RPC').getValue();
  const chainName = doc.getRangeByName('network').getValue();
  const config = `${rpc},${chainName}`;

  const fetch = makeFetch();
  const qClient = await makeQueryClient({ fetch }).withConfig(config);
  const keys = ['brand', 'instance', 'vbankAsset'].map(
    child => `published.agoricNames.${child}`,
  );
  const qCache = withCache(
    qClient,
    keys,
    PropertiesService.getDocumentProperties(),
  );
  {
    const board = makeBoardClient(qCache);
    const agoricNames = await board.provideAgoricNames();
  }
  {
    const board = makeBoardClient(qCache);
    const agoricNames = await board.provideAgoricNames();
  }
};

const testProperties = () => {
  console.warn('AMBIENT: PropertiesService');
  const ps = PropertiesService.getDocumentProperties();
  console.log('keys before', ps.getKeys());
  ps.setProperties({ a: 1 });
  const makeCounter = (init = 0) => {
    let v = init;
    return {
      incr: () => (v += 1),
      decr: () => (v -= 1),
    };
  };
  if (!ps.getKeys().includes('c')) {
    ps.setProperty('c', makeCounter());
  }
  console.log('c', ps.getProperty('c'));
  const c = ps.getProperty('c');
  ps.setProperty('d', c.incr());
  console.log('d', ps.getProperty('d'));
  console.log('keys after', ps.getKeys());
};
