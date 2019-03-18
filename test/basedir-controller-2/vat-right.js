export default function setup(syscall, _helpers) {
  function dispatch(facetid, method, argsbytes, caps) {
    console.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
    syscall.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  }
  return dispatch;
}
