function dispatch(syscall, facetID, method, argsString, slots) {
  syscall.log(JSON.stringify({ facetID, method, argsString, slots }));
}

export default function start() {
  return dispatch;
}
