const { fork } = require('child_process');

const test = require('tape');

//const exec = promisify(execCb)

// to keep in sync with https://agoric.com/documentation/getting-started/


const firstProcessExitListener = code => {
  console.error(`agoric init + start process stopped while it shouldn't have`)
  t.fail(code);
  t.end()
}

test('getting stated instructions', async t => {
  console.log('Running commands in a first shell to run agoric start')

  const initStartProcess = fork('./test/agoric-init-start.js', {stdio: 'inherit'})
  
  initStartProcess.on('error', error => {
    t.fail(error);
    initStartProcess.kill()
    t.end()
  })
  initStartProcess.on('exit', firstProcessExitListener)


  setTimeout(() => {
    t.pass('pass after 15secs')
    t.end()
    initStartProcess.off('exit', firstProcessExitListener)
    initStartProcess.kill()
    
  }, 15000)
  

  //t.equal(mf1, 'getExport', 'module format is getExport');
  //t.assert(src1.match(/require\('@agoric\/harden'\)/), 'harden is required');
  //t.end();
});