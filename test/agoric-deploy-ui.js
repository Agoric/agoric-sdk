const {execSync} = require('child_process')

// To keep in sync with https://agoric.com/documentation/getting-started/

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

process.chdir('/tmp/demo')
console.log('cwd', process.cwd())

runCommand('agoric deploy ./contract/deploy.js ./api/deploy.js')

process.chdir('ui')
console.log('cwd', process.cwd())

runCommand('yarn install')
runCommand('yarn start')

/*
cd demo
agoric deploy ./contract/deploy.js ./api/deploy.js
cd ui
yarn install
yarn start

*/