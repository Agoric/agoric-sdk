export const makeSlogSender = async _opts => {
  return Object.assign(() => {}, { forceFlush: async () => {} });
};
