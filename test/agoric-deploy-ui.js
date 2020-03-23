const {exec, execSync} = require('child_process')

// To keep in sync with https://agoric.com/documentation/getting-started/

function runCommand(cmd, options={}){
    try{
        return execSync(cmd, {stdio: 'inherit', ...options})
    }
    catch(err){
        console.error(`${cmd} error`, err)
        process.exit(1)
    }
}

console.log('cwd', process.cwd())

process.chdir('/tmp/demo')
console.log('cwd', process.cwd())



/*
With runCommand ({stdio: 'inherit'}), i can see the error in deploy
> cannot create initial offers TypeError: Cannot read property 'exit' of undefined


With exec below (stdout should be buffered and passed to the callback), but the string is empty. Same for stderr

No idea why there is a difference

*/

runCommand('agoric deploy ./contract/deploy.js ./api/deploy.js')

/*
exec('agoric deploy ./contract/deploy.js ./api/deploy.js', (err, stdout, stderr) => {
    console.log('DEPLOY err', err)
    console.log('DEPLOY stdout', typeof stdout)
    console.log('DEPLOY stderr', typeof stderr)

    process.exit()

    process.chdir('ui')
    console.log('cwd', process.cwd())

    runCommand('yarn install')
    runCommand('yarn start')
})*/




/*
cd demo
agoric deploy ./contract/deploy.js ./api/deploy.js
cd ui
yarn install
yarn start

*/