console.log(`left loaded`);
export default function dispatch(syscall, facetid, method, argsbytes, caps) {
  console.log(`left dispatch(${facetid}, ${method})`);
  syscall.log(`left dispatch(${facetid}, ${method})`);
}
