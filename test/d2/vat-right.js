function dispatch(syscall, facetid, method, argsbytes, caps) {
  console.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  syscall.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
}

export default function setup() {
  return dispatch;
}
