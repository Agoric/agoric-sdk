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
  };
};
