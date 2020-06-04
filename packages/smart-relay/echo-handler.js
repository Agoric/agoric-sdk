// eslint-disable-next-line no-unused-vars
function makeHandler(endowments) {
  const {
    // E,
    harden,
    console,
  } = endowments;
  return harden({
    handle(send, obj) {
      console.log(`echo-handler handle(${obj})`);
      send(obj); // eg
    },
  });
}
