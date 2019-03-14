function dispatch(syscall, facetid, method, argsbytes, caps) {
  console.log(`left dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  syscall.log(`left dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
}

export default function setup() {
  return dispatch;
}
