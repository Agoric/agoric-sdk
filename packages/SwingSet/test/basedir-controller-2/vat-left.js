export default function setup(syscall, _state, _helpers) {
  function deliver(facetid, method, argsbytes, caps) {
    console.log(`left dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
    syscall.log(`left dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  }
  return { deliver };
}
