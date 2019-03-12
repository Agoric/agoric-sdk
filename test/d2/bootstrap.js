console.log(`loading bootstrap`);
export default function bootstrap(kernel) {
  console.log(`bootstrap called`);
  kernel.log(`bootstrap called`);
  kernel.connect('left', -1, 'right', 5);
  kernel.queue('left', 0, 'bootstrap', JSON.stringify({}));
}
