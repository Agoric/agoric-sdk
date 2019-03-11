console.log(`loading bootstrap`);
export default function bootstrap(controller) {
  console.log(`bootstrap called`);
  controller.queue('left', 0, 'bootstrap', JSON.stringify({}));
}
