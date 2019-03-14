export default function start(syscall, _helpers) {
  function dispatch(facetID, method, argsString, slots) {
    syscall.log(JSON.stringify({ facetID, method, argsString, slots }));
  }
  return dispatch;
}
