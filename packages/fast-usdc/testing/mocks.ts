export const mockOut = () => {
  let logOut = '';
  let errOut = '';
  return {
    log: (s: string) => (logOut += `${s}\n`),
    error: (s: string) => (errOut += `${s}\n`),
    getLogOut: () => logOut,
    getErrOut: () => errOut,
  };
};

export const mockrl = (answer: string) => {
  return {
    question: () => Promise.resolve(answer),
    close: () => {},
  };
};

export const mockFile = (path: string, contents = '') => {
  const read = () => {
    if (!contents) {
      throw new Error();
    }
    return contents;
  };
  const write = (val: string) => {
    contents = val;
  };
  const exists = () => !!contents;

  return { read, write, exists, path };
};
