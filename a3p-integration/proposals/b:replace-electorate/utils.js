export const waitUntil = async waitTime => {
  while (Math.floor(Date.now() / 1000) < waitTime) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};
