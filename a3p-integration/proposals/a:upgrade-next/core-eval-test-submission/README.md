These files enable a test of core-eval in an upgraded chain.

send-script is a test submission, which is transmitted in ../core-eval.test.js.
Some template values in the `.tjs` file are replaced before submitting the
core-eval. The test then verifies that the core-eval written the expected
values to vstorage.
