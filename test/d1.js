export default function d1(syscall, facetID, method, argsString, slots) {
  syscall.log(JSON.stringify({ facetID, method, argsString, slots }));
}
