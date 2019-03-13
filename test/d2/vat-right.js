function dispatch(syscall, facetid, method, argsbytes, caps) {
  // 5 is what bootstrap.js exports to vatLeft
  console.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  syscall.log(`right dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
}

export default function setup() {
  return dispatch;
}
