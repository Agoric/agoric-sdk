# Snapshot test sketch

see especially the `// snapshot worker?` comments in `main.js`.

tested on linux
with moddable version 54d8e94710ed6f8c310f046c4fbc83c967ccd346

## Run as usual

```
mkdir -p build
mcconfig -o build -d -m
```

## Expected Results

```
bundleSource reading...
setBundle...
from vatHost: ok
deliver...
from vatHost: 0
from vatHost: 1
from vatHost: 2
from vatHost: 1
demo concludes.
vatHost handling: ["setBundle","(function buildRootObject(vatPowers) {\n  const { freeze } = Object;\n  const { testLog } = vatPowers;\n\n  let count = 0;\n\n  return freeze({\n    incr() {\n      return count++;\n    },\n    decr() {\n      return count--;\n    },\n  });\n});\n"]
vatHost handling: ["deliver","message","slot1",{"method":"incr","args":[]}]
vatHost handling: ["deliver","message","slot1",{"method":"incr","args":[]}]
vatHost handling: ["deliver","message","slot1",{"method":"decr","args":[]}]
vatHost handling: ["deliver","message","slot1",{"method":"incr","args":[]}]
```
