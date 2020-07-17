export function makePrintLog() {
  return function printLog(...args) {
    const rendered = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg),
    );
    console.log(rendered.join(''));
  };
}
