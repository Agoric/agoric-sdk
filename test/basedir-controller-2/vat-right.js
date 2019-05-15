export default function setup(syscall, _state, _helpers) {
  function deliver(facetid, method, argsbytes, caps) {
    console.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
    syscall.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  }
  return { deliver };
}
