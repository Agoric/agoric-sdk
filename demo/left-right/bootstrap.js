console.log(`loading bootstrap`);
export default function bootstrap(controller) {
  console.log(`bootstrap called`);
  controller.log(`bootstrap called`);
  controller.connect('left', -1, 'right', 5);
  controller.queue('left', 0, 'bootstrap', JSON.stringify({}));
}
