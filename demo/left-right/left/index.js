console.log(`left loaded`);
export default function dispatch(syscall, facetid, method, argsbytes, caps) {
  console.log(`left dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  syscall.log(`left dispatch(${facetid}, ${method}, ${argsbytes}, ${caps})`);
  // -1 is our import of something in vatRight
  // 4 is our export of an imaginary local object
  syscall.send(-1, 'hello', JSON.stringify([2, 3]), [4]);
}
