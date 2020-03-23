const { request } = require('http')
const { spawn, execSync } = require('child_process')


// To keep in sync with https://agoric.com/documentation/getting-started/

function runCommand(cmd) {
  console.log('RUNNING', cmd)
  try {
    execSync(cmd, { stdio: 'inherit' })
  }
  catch (err) {
    console.error(`${cmd} error`, err)
    process.exit(1)
  }
}

console.log('cwd', process.cwd())

// cd /tmp
process.chdir('/tmp')
console.log('cwd', process.cwd())

runCommand('agoric init demo')

// cd demo
process.chdir('demo')
console.log('cwd', process.cwd())

runCommand('agoric install')

console.log('RUNNING', 'agoric start --reset')
const agoricStartProcess = spawn('agoric', ['start', '--reset'], { stdio: 'inherit' })
// for some reason, if stdout is piped, 'agoric start' closes the stream early, making it impossible to 
// inspect stdout for relevant messages
// no other 'agoric x' command has this problem

// anyway, trying port 8000 until it does not return an error

const interval = setInterval(() => {
  const sendReady = () => {
    console.log('server on localhost:8000 is certainly ready')
    if(process.send){
      process.send({httpReady: true})
    }
    clearInterval(interval)
  }

  const noErrorTimeout = setTimeout(sendReady, 2000)

  const req = request('http://localhost:8000/', res => {
    console.log('something came back from localhost:8000')
    sendReady()
    clearTimeout(noErrorTimeout)
  })

  req.on('error', err => {
    clearTimeout(noErrorTimeout)
    if(err.code === 'ECONNREFUSED'){
      console.error('agoric started server on localhost:8000 not ready yet')
    }
    else{
      console.error('http 8000 error', err)
    }
  })

}, 3000)