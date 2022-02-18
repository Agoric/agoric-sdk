export const buildRootObject = () => {
  const a = {
    a: 123,
    b: 456,
  };
  return harden({
    run: () => a,
  });
};
// comment
