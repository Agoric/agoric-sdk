const {execSync} = require('child_process')

function runCommand(cmd){
    try{
        execSync(cmd, {stdio: 'inherit'})
    }
    catch(err){
        console.error(`${cmd} error`, err)
        process.exit(1)
    }
}

console.log('cwd', process.cwd())

process.chdir('/tmp')
console.log('cwd', process.cwd())

/*
agoric init demo
cd demo
agoric install
agoric start --reset
*/

runCommand('agoric init demo')

process.chdir('demo')
console.log('cwd', process.cwd())

runCommand('agoric install')
runCommand('agoric start --reset')