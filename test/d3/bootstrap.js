console.log(`loading bootstrap`);
export default function bootstrap(kernel) {
  console.log(`bootstrap called`);
  kernel.log(`bootstrap called`);
  const leftT1 = kernel.runStart('left')[0];
  kernel.sendFrom('left', leftT1, 'foo', JSON.stringify(['arg1val']), []);
  const leftR5 = kernel.addImport('left', 'right', 5);
  kernel.sendFrom(
    'left',
    leftT1,
    'callRight',
    JSON.stringify([{ '@qclass': 'slot', index: 0 }]),
    [leftR5],
  );
}
