import ddTrace from 'dd-trace';

export const datadogTracer = ddTrace.init({
  logInjection: true,
});
