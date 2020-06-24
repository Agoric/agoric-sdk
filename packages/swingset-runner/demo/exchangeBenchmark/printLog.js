export function makePrintLog(kernelLog) {
  return function printLog(...args) {
    kernelLog(...args);
    const rendered = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg),
    );
    console.log(rendered.join(''));
  };
}
