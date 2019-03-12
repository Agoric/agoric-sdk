console.log(`loading bootstrap`);
export default function bootstrap(kernel) {
  console.log(`bootstrap called`);
  kernel.log(`bootstrap called`);
  const leftT1 = kernel.runStart('left')[0];
  // kernel.connect('left', -1, 'right', 5);
  kernel.queue('left', leftT1, 'foo', JSON.stringify(['arg1val']));
}
