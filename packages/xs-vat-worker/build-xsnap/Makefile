
## targets to build xsnap test files
SRUNNER=../../swingset-runner

slog.out:
	node -r esm $(SRUNNER)/bin/runner --slog slog.out --init --config $(SRUNNER)/demo/exchangeBenchmark/swingset.json --benchmark 1 run -- --prime

.PHONY: list-vats
list-vats: slog.out
	node -r esm ./convert-slog-to-xsnap.js slog.out

clean-output:
	rm -rf output

bundle-functions-node.js: input/functions.js
	yarn exec -- rollup --config rollup-config-node.js
output-node: bundle-functions-node.js slog.out
	node -r esm ./convert-slog-to-xsnap.js slog.out v1 --node output
run-node:
	# this only runs the setup step
	node -r esm output/build.js

bundle-functions-xsnap.js: input/functions.js
	yarn exec -- rollup --config rollup-config-xsnap.js
output-xsnap: bundle-functions-xsnap.js slog.out
	node -r esm ./convert-slog-to-xsnap.js slog.out v1 --xsnap output
run-xsnap:
	xsnap -m output/build.js
