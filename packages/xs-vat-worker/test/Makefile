NODE_ESM=node -r esm

transcript.txt: swingset-kernel-state
	$(NODE_ESM) ../swingset-runner/bin/kerneldump --filedb ./swingset-kernel-state | grep v1.t |sort >$@

swingset-kernel-state: bootstrap.js vat-target.js
	$(NODE_ESM) ../swingset-runner/bin/runner --filedb run

ZOE1=../zoe/test/swingsetTests/zoe


zoe: transcript-zoe.txt ./node-vat-worker index.js vatWorker.js kernelSimulator.js
	VAT1=$(ZOE1)/vat-zoe.js TRANSCRIPT=transcript-zoe.txt node -r esm kernelSimulator.js

zoe-node: transcript-zoe.txt ./node-vat-worker index.js vatWorker.js kernelSimulator.js
	VAT1=$(ZOE1)/vat-zoe.js TRANSCRIPT=transcript-zoe.txt WORKERBIN=./node-vat-worker node -r esm kernelSimulator.js


transcript-zoe.txt: $(ZOE1)/swingset-kernel-state
	$(NODE_ESM) ../swingset-runner/bin/kerneldump --filedb $(ZOE1)/swingset-kernel-state | grep ^v5.t | grep -v nextID >,zoe-all
	python sort_transcript.py <,zoe-all >$@


$(ZOE1)/swingset-kernel-state: ,zoe-patched
	(cd $(ZOE1) && $(NODE_ESM) ../../../../swingset-runner/bin/runner --filedb run)

,zoe-patched: $(ZOE1)/bootstrap.js zoe-test.patch
	cd ../.. && patch -p1 <packages/xs-vat-worker/zoe-test.patch
	touch $@
