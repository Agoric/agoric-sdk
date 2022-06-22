/**
 * @param {string} key
 * @param {unknown} value
 */
export const maybeSave = (key, value) => {
  if (window?.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};

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
