
This tool converts a 'slog' trace (a record of all SwingSet vat deliveries
and the syscalls they provoke) into an output directory full of files that
can be run by the XS 'xsnap' tool. The first file, `output/build.js`, loads
the source bundle of a single vat, and prepares it for deliveries. The second
file, `output/deliver-0.js`, uses the previously exported function and
delivers the first message. It checks the generated syscalls against the
expected list. The other `output/deliver-NN.js` files do the same for all the
rest of the messages.

These are meant to be run by 'xsnap' like:

* xsnap -m output/build.js -w state.xsnap
* xsnap -m output/deliver-0.js -r state.xsnap -w state.xsnap
* xsnap -m output/deliver-1.js -r state.xsnap -w state.xsnap
* etc

refs #511
