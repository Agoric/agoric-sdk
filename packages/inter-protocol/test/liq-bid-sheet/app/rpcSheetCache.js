export const withCache = (qClient, keys, store) => {
  const readLatest = async path => {
    if (!keys.includes(path)) {
      // not cached
      return qClient.readLatest(path);
    }
    if (store.getKeys().includes(path)) {
      // cache hit
      console.log(path, 'cache HIT');
      return store.getProperty(path);
    }
    // cache miss
    console.log(path, 'cache MISS');
    const content = await qClient.readLatest(path);
    store.setProperty(path, content);
    return content;
  };
  return {
    ...qClient,
    vstorage: { ...qClient.vstorage, readLatest },
    readLatest,
  };
};

const ClearVStorageCache = () => {
  const ps = PropertiesService.getDocumentProperties();
  ps.deleteAllProperties();
};
