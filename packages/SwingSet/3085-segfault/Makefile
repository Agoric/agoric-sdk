
setup:
	cd ../../.. && git submodule update --init && yarn
	cd ../../xsnap/moddable && git remote add moddable https://github.com/Moddable-OpenSource/moddable
	cd ../../xsnap/moddable && git remote update
	cd ../../xsnap && yarn build

# make rebuild-xsnap : uses the agoric version, as used in the original crash: SIGSEGV
# make rebuild-xsnap MODDABLE_COMMIT_HASH=OS210504 : uses latest Moddable release: no crash
#  =OS210504~10 (aka 783dc8a3): SIGSEGV
#  =OS210504~9 (aka a07af8a0): no crash

rebuild-xsnap:
	cd ../../xsnap && yarn clean && yarn build

# replay takes about 20s, and generates xsnap-tests/ as it runs
replay:
	rm -rf xsnap-tests
	node -r esm ../bin/replay-transcript.js transcript-v1.sst-woulda

# the crash is indicated by 'make replay' ending with:
#
#  delivery 4312: ["message","o+3",{"method":"deposit","args":{"body":"[{\"@qclass\":\"slot\",\"iface\":\"Alleged: RUN brand\",\"index\":0},\"agoric1tu0gkhr0pmavp3xylsfqph3utsrgswnwkwplvz\",{\"@qclass\":\"slot\",\"ifac
#  RUN ERR (Error#1)
#  Error#1: delivery failed: v1:undefined exited due to signal SIGSEGV
#    at Object.replayOneDelivery (/home/warner/stuff/agoric/agoric-sdk/packages/SwingSet/src/kernel/vatManager/manager-helper.js:164:13)
#    at runMicrotasks (<anonymous>)
#    at processTicksAndRejections (internal/process/task_queues.js:93:5)
#    at async replay (/home/warner/stuff/agoric/agoric-sdk/packages/SwingSet/bin/replay-transcript.js:159:18)
#    at async run (/home/warner/stuff/agoric/agoric-sdk/packages/SwingSet/bin/replay-transcript.js:180:3)

# non-crashing replay looks like:
#
#  delivery 4312: ["message","o+3",{"method":"deposit","args":{"body":"[{\"@qclass\":\"slot\",\"iface\":\"Alleged: RUN brand\",\"index\":0},\"agoric1tu0gkhr0pmavp3xylsfqph3utsrgswnwkwplvz\",{\"@qclass\":\"slot\",\"ifac
#  dr [
#    'ok',
#    null,
#    {
#      meterType: 'xs-meter-6',
#      compute: 69905,
#      allocate: 75628576,
#      allocateChunksCalls: 1,
#      allocateSlotsCalls: 10,
#      garbageCollectionCount: 0,
#      mapSetAddCount: 0,
#      mapSetRemoveCount: 0,
#      maxBucketSize: 0
#    }
#  ]
