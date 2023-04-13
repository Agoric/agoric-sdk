'use strict';

function makeFetch() {
  const { freeze } = Object;

  console.warn('AMBIENT: UrlFetchApp');
  const app = UrlFetchApp;

  const fetch = async url => {
    const content = app.fetch(url);
    return freeze({
      json: async () => JSON.parse(content),
    });
  };
  return fetch;
}
