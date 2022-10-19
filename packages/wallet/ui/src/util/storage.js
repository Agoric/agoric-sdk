// @ts-check

export const DAPPS_STORAGE_KEY = 'DAPPS';

export const OFFERS_STORAGE_KEY = 'OFFERS';

/**
 * @param {unknown} key
 * @param {unknown} value
 */
export const maybeSave = (key, value) => {
  if (window?.localStorage) {
    try {
      window.localStorage.setItem(JSON.stringify(key), JSON.stringify(value));
    } catch (e) {
      console.error(e);
    }
  } else {
    // TODO: More user friendly way of handling this.
    console.error('No localStorage found on "window"');
  }
};

/**
 * @param {unknown} key
 */
export const maybeLoad = key => {
  if (window?.localStorage) {
    try {
      const json = window.localStorage.getItem(JSON.stringify(key));
      if (json) {
        return JSON.parse(json);
      }
    } catch (e) {
      console.error(e);
      return undefined;
    }
  } else {
    console.error('No localStorage found on "window"');
  }
  return undefined;
};

/**
 * @param {unknown} key
 * @param {(newValue: unknown) => void} onValueChange
 */
export const watchKey = (key, onValueChange) => {
  window.addEventListener('storage', ev => {
    if (ev.key !== JSON.stringify(key)) return;

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
