const { fork } = require('child_process');

const test = require('tape');

//const exec = promisify(execCb)

// to keep in sync with https://agoric.com/documentation/getting-started/


test('getting stated instructions', async t => {
  console.log('Running commands in a first shell for agoric init + start')

  const initStartProcessExitListener = code => {
    console.error(`agoric init + start process stopped while it shouldn't have`)
    t.fail(code);
    t.end()
  }
  const deployUiProcessExitListener = code => {
    console.error(`agoric init + start process stopped while it shouldn't have`)
    t.fail(code);
    t.end()
  }

  const initStartProcess = fork('./test/agoric-init-start.js', {stdio: 'inherit'})

  initStartProcess.on('error', error => {
    t.fail(error);
    initStartProcess.kill()
    t.end()
  })
  initStartProcess.on('exit', initStartProcessExitListener)

  const vatsReadyP = new Promise(resolve => {
    initStartProcess.on('message', (message) => {
      console.log('receieved message from initStartProcess', message)
      if(message.httpReady){
        console.log('message.httpReady', message.httpReady)
        resolve()
      }
    })
  })


  vatsReadyP
  .then(() => {
    console.log('In a second shell, run agoric deploy + ui + yarn install+start')

    const deployUiProcess = fork('./test/agoric-deploy-ui.js', {stdio: 'inherit'})

    deployUiProcess.on('error', error => {
      t.fail(error);
      
      initStartProcess.on('exit', initStartProcessExitListener)
      initStartProcess.kill()

      deployUiProcess.on('exit', deployUiProcessExitListener)
      deployUiProcess.kill()

      t.end()
    })
    deployUiProcess.on('exit', deployUiProcessExitListener)
  })


  // finalize steps
  //t.pass('pass after 15secs')
  //t.end()
  //initStartProcess.off('exit', firstProcessExitListener)
  //initStartProcess.kill()
  
  

  //t.equal(mf1, 'getExport', 'module format is getExport');
  //t.assert(src1.match(/require\('@agoric\/harden'\)/), 'harden is required');
  //t.end();
});