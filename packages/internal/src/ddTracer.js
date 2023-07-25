import ddtrace from 'dd-trace';

export const controllerTracer = ddtrace.init({
  service: 'controller',
  env: 'dev',
  version: 'master:1.0.0',
  logInjection: true,
});

export const kernelTracer = ddtrace.init({
  service: 'kernel',
  env: 'dev',
  version: 'master:1.0.0',
  logInjection: true,
});

export const vatTracer = ddtrace.init({
  service: 'vat',
  env: 'dev',
  version: 'master:1.0.0',
  logInjection: true,
});

export const deviceTracer = ddtrace.init({
  service: 'device',
  env: 'dev',
  version: 'master:1.0.0',
  logInjection: true,
});
