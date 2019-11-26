console.log(`loading bootstrap`);
export default function setup(syscall, _state, helpers) {
  console.log(`bootstrap called`);
  helpers.log(`bootstrap called`);
  function deliver(facetid, method, argsbytes, caps) {
    console.log(
      `bootstrap dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`,
    );
    syscall.log(
      `bootstrap dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`,
    );
  }
  return { deliver };
}
