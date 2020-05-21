import { lockdown } from 'ses';

lockdown({
  // errorTaming: 'unsafe', // enable if needed, for better debugging
  mathTaming: 'unsafe', // bundle-source -> rollup uses Math.random
});

process.on('unhandledRejection', (error, _p) => {
  console.log('unhandled rejection, boo');
  console.log('error is', error.toString());
  return true;
});
