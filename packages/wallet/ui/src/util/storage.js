// @ts-check
export const DAPPS_STORAGE_KEY = 'DAPPS';

/**
 * @param {string} key
 * @param {unknown} value
 */
export const maybeSave = (key, value) => {
  if (window?.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};

/**
 * @param {string} key
 */
export const maybeLoad = key => {
  if (window?.localStorage) {
    try {
      const json = window.localStorage.getItem(key);
      if (json) {
        return JSON.parse(json);
      }
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
  return undefined;
};

export const watchKey = (key, onValueChange) => {
  window.addEventListener('storage', ev => {
    console.log('storage event happened!');
    if (!ev.key === key) return;

    try {
      const json = ev.newValue;
      if (json) {
        onValueChange(JSON.parse(json));
      }
    } catch (e) {
      console.error('Error parsing storage event', ev);
    }
  });
};
