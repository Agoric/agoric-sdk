This directory holds source bundles that are generated at build time.

`kernel` holds the contents of `src/kernel/`, combined into a single file
with `rollup`, then wrapped in a stringifiable function by code in
`scripts/build-kernel`. This allows code in `src/index.js` to import this
function, stringify it, then evaluate that string inside the SES realm.
