/* global require, process */
/* eslint-disable global-require */
(async () => {
  const { main } = await import('./src/replay.js');
  main([...process.argv.slice(2)], {
    spawn: require('child_process').spawn,
    osType: require('os').type,
    readdirSync: require('fs').readdirSync,
    readFileSync: require('fs').readFileSync,
  });
})().catch(err => {
  console.error(err);
  process.exit(err.code || 1);
});
