import foo from 'readline'

let cachedScriptGetter = null;

function readFile(fs, path, userPath) {
    // const FPATH = '/Users/danwt/documents/agoric-sdk/packages/Swingset/src/kernel/myscriptgetter'
    const FPATH = '/Users/danwt/documents/audits-internal/agoric-2107/adversarial-mbt/userspace/'
    const fullPath = path.join(FPATH, userPath)
    const data = fs.readFileSync(fullPath, 'utf8')
    return data
}

function readScript(fs, path, userPath) {
    return JSON.parse(readFile(fs, path, userPath))
}

export default function initScriptGetter(filename) {

    if (cachedScriptGetter !== null) {
        return cachedScriptGetter;
    }

    // Import like this gets around import system
    let [_0, _1, fs, path] = [...foo];

    let script

    if (filename !== "None") {
        script = readScript(fs, path, filename)
    }

    function getScript() {
        return script
    }

    function getFilename() {
        return filename
    }

    let transitionIx = 0

    function exhausted() {
        return script.transitions.length <= transitionIx
    }

    /**
     * Check that the next step, if there is one
     */
    function notExhaustedAndNextActorMatch(vatName) {
        return !exhausted() && script.transitions[transitionIx].actor === vatName
    }

    function nextTransition() {
        assert(!exhausted())
        return script.transitions[transitionIx++]
    }

    cachedScriptGetter = { getScript, nextTransition, exhausted, getFilename, notExhaustedAndNextActorMatch }

    return cachedScriptGetter;
}


