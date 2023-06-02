# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.32.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.32.1...@agoric/swingset-vat@0.32.2) (2023-06-02)

**Note:** Version bump only for package @agoric/swingset-vat





### [0.32.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.32.0...@agoric/swingset-vat@0.32.1) (2023-05-24)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.32.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.30.2...@agoric/swingset-vat@0.32.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* move swingset state dir
* **xsnap:** start xsnap takes snapshot stream
* **xsnap:** makeSnapshot yields snapshot data
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies (#7074)
* **xsnap:** Update Moddable SDK and xsnap-native (#6920)
* rename 'fit' to 'mustMatch'
* ensure KindHandle has a tag

### Features

* **tools:** advanceBy for ManualTimer ([94172c8](https://github.com/Agoric/agoric-sdk/commit/94172c8d1e6758d127dbe61e21ffafaa9c2f2489))
* Add SwingSet configuration to purge vstorage within (re-)bootstrap ([f248e91](https://github.com/Agoric/agoric-sdk/commit/f248e9116512374fb95f789b26e27b66cd5c34ca)), closes [#7681](https://github.com/Agoric/agoric-sdk/issues/7681)
* move swingset state dir ([eddb46b](https://github.com/Agoric/agoric-sdk/commit/eddb46bd0e41340aec7d420adc37074fbca1b177))
* **controller:** louder UnhandledPromiseRejection log ([cd67304](https://github.com/Agoric/agoric-sdk/commit/cd67304559083e04d445d5956529449d6dcd94fb))
* extend Prometheus kernel stats ([44a934f](https://github.com/Agoric/agoric-sdk/commit/44a934f0d0a5177000b5bf081ae27e35a05c9aef)), closes [#7092](https://github.com/Agoric/agoric-sdk/issues/7092) [#7092](https://github.com/Agoric/agoric-sdk/issues/7092)
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies ([#7074](https://github.com/Agoric/agoric-sdk/issues/7074)) ([ed5ee58](https://github.com/Agoric/agoric-sdk/commit/ed5ee58a276fce3c55f19e4f6f662ed579896c2c)), closes [#7047](https://github.com/Agoric/agoric-sdk/issues/7047)
* **auction:** add an auctioneer to manage vault liquidation ([#7000](https://github.com/Agoric/agoric-sdk/issues/7000)) ([398b70f](https://github.com/Agoric/agoric-sdk/commit/398b70f7e028f957afc1582f0ee31eb2574c94d0)), closes [#6992](https://github.com/Agoric/agoric-sdk/issues/6992) [#7047](https://github.com/Agoric/agoric-sdk/issues/7047) [#7074](https://github.com/Agoric/agoric-sdk/issues/7074)
* **bundleTool:** color the console output ([e746319](https://github.com/Agoric/agoric-sdk/commit/e746319052349a112092387eed04121c41f27aa1))
* **bundleTool:** idempotent provideBundleCache ([026bcd4](https://github.com/Agoric/agoric-sdk/commit/026bcd4abe39fa2c73a05c3837b7e04082db1157))
* **cosmic-swingset:** Add a config property for exporting storage to bootstrap ([c065f3b](https://github.com/Agoric/agoric-sdk/commit/c065f3b2be675513343a70853ea607750d13776b)), closes [#7156](https://github.com/Agoric/agoric-sdk/issues/7156)
* **notifier:** Introduce durable publish kits ([#6502](https://github.com/Agoric/agoric-sdk/issues/6502)) ([8f7b353](https://github.com/Agoric/agoric-sdk/commit/8f7b3530ca50dc1945f024690a63914fe8431502))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **swingset:** persist xsnap bundle IDs at vat creation/upgrade ([33204ac](https://github.com/Agoric/agoric-sdk/commit/33204ac28420816eb6e61e4a9b4cf946a7e1bb24)), closes [#7208](https://github.com/Agoric/agoric-sdk/issues/7208)
* **swingset:** rewrite kernel to use getNextKey instead of getKeys ([58d2e29](https://github.com/Agoric/agoric-sdk/commit/58d2e291f51cf0da3dd2a08f06c0eac348abf236)), closes [#6468](https://github.com/Agoric/agoric-sdk/issues/6468)
* **SwingSet:** add `D(bridgeDevice).unregisterInboundHandler()` ([782f83b](https://github.com/Agoric/agoric-sdk/commit/782f83bbce629a721ddd273aad05a5f16ea32341))
* **SwingSet:** add runtimeOption to keep worker on snapshot ([a1e0d09](https://github.com/Agoric/agoric-sdk/commit/a1e0d09539df75bffe6064bbac312147245d938d))
* **SwingSet:** force reload from snapshot ([86de218](https://github.com/Agoric/agoric-sdk/commit/86de2188ce73ed9c3f5d48f7826b77106c1af864))
* **SwingSet:** loadSwingsetConfigFile detects missing files ([64a3baa](https://github.com/Agoric/agoric-sdk/commit/64a3baa3a538e1a51477535fb35a186736b61622)), closes [Error#1](https://github.com/Agoric/Error/issues/1) [Error#1](https://github.com/Agoric/Error/issues/1)
* **swingset-tools:** [replay] add some worker stats ([e8014a5](https://github.com/Agoric/agoric-sdk/commit/e8014a5b93da9a1715d53b4e98a47f79846f379b))
* **swingset-tools:** [replay] add syscall divergence analysis ([12518eb](https://github.com/Agoric/agoric-sdk/commit/12518ebe8042484c361d0f187ef452c8682c08ac))
* **swingset-tools:** [replay] better snapshot messages ([5a316ee](https://github.com/Agoric/agoric-sdk/commit/5a316ee36fb90479ade4900ff49a223979f9e29f))
* **swingset-tools:** [replay] convert options to command line parsed ([7ca2b23](https://github.com/Agoric/agoric-sdk/commit/7ca2b23a57c91f940fc8c8a189f2012a22932d5d))
* **swingset-tools:** [replay] force load snapshots ([e445253](https://github.com/Agoric/agoric-sdk/commit/e445253cdda66d64bc6af0a554978f0d97d65cff))
* **swingset-tools:** [replay] force snapshot making on interval ([a273959](https://github.com/Agoric/agoric-sdk/commit/a2739595d28d258369cd0fd02ae4f35c3087714e))
* **swingset-tools:** [replay] handle various transcript logic versions ([3b1c2ce](https://github.com/Agoric/agoric-sdk/commit/3b1c2cef4ed60eaebf79b23818c89ffa7cb89032))
* **swingset-tools:** [replay] implement custom compareSyscalls ([abc8109](https://github.com/Agoric/agoric-sdk/commit/abc810989226e2ce9565a21c7ff0b0fc01468d2a))
* **swingset-tools:** [replay] improve multi worker logic ([c54934a](https://github.com/Agoric/agoric-sdk/commit/c54934a7db5cffaf244f0562b08673b3ff11b0b0))
* **swingset-tools:** [replay] keep divergent and explicitly loaded workers ([bd629df](https://github.com/Agoric/agoric-sdk/commit/bd629df9af17411b4b78f9f5a914064ad9aa3480))
* **swingset-tools:** [replay] Option to load snapshots through config ([fd022de](https://github.com/Agoric/agoric-sdk/commit/fd022de8bc064e4521ab79f4edf5f47aca9534f0))
* **swingset-tools:** [replay] spawn multiple workers ([a104fb2](https://github.com/Agoric/agoric-sdk/commit/a104fb2789588654cf55cb979285d105f57d6d32))
* **swingset-tools:** [replay] support bundleIDs ([779f188](https://github.com/Agoric/agoric-sdk/commit/779f188aeebac3dc0459bf4c5e5c02a435fbfc98))
* **swingset-tools:** [replay] use transcriptNum ([dabbb12](https://github.com/Agoric/agoric-sdk/commit/dabbb1208a5a0efff4d6c1ba1671d08c2a87538f))
* **swingset-tools:** [replay] write activity log ([94b4ee6](https://github.com/Agoric/agoric-sdk/commit/94b4ee646e522fe5bdbed712ce540572aa1a94a4))
* **swingset-tools:** add tool to extract bundles ([0144ec1](https://github.com/Agoric/agoric-sdk/commit/0144ec1efcdc41fa612b90883e634fb647d3d800))
* **swingset-tools:** reference bundleIDs when extracting transcript ([d2d3047](https://github.com/Agoric/agoric-sdk/commit/d2d3047ddf0afadb3ebf1e991b46b287f4d82324))
* **swingstore:** add support for b0- bundles ([4a3b320](https://github.com/Agoric/agoric-sdk/commit/4a3b32045a332f8a3ed1fe5e3ad74e8719c870e4)), closes [#7190](https://github.com/Agoric/agoric-sdk/issues/7190)
* **xsnap:** makeSnapshot yields snapshot data ([348bbd2](https://github.com/Agoric/agoric-sdk/commit/348bbd2d9c251e7ec0f0aa109034d4bdb5ce89e4))
* **xsnap:** start xsnap takes snapshot stream ([ed87de1](https://github.com/Agoric/agoric-sdk/commit/ed87de12e46095aa18f56b7d0118c6c76d5bef64))
* add APIs for tracking/debugging undesired object retention (aka "leaks") ([0a7221b](https://github.com/Agoric/agoric-sdk/commit/0a7221b3c04f3b2894c30346fa2ea6fb0130c046)), closes [#7318](https://github.com/Agoric/agoric-sdk/issues/7318)
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric-sdk/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric-sdk/issues/7482)
* cache bundles in initializeSwingset ([6e57171](https://github.com/Agoric/agoric-sdk/commit/6e57171ef303334e4cb776ba3fa503f5219d409e))
* Convert SwingSet to use smallcaps encoding for serialized data ([f289ec0](https://github.com/Agoric/agoric-sdk/commit/f289ec0868bf66ab3d48b32e5933ef12aa3a9edc)), closes [#6326](https://github.com/Agoric/agoric-sdk/issues/6326)
* create new xsnap-lockdown package ([2af831d](https://github.com/Agoric/agoric-sdk/commit/2af831d9683a4080168ee267e8d57227d2167f37)), closes [#6596](https://github.com/Agoric/agoric-sdk/issues/6596)
* eliminate storage wrapper ([35cce9f](https://github.com/Agoric/agoric-sdk/commit/35cce9f1ad38f0f0cd4826b2b602dca1d1c38d77))
* extract swingset-xsnap-supervisor out to a separate package ([0024f01](https://github.com/Agoric/agoric-sdk/commit/0024f0128ff658c93468069b6fa5cc3bebfbdc78)), closes [#6596](https://github.com/Agoric/agoric-sdk/issues/6596)
* implement swingStore data export/import in support of state sync ([268e62f](https://github.com/Agoric/agoric-sdk/commit/268e62f8d68063de6416042ac1a8b94df89f3399)), closes [#6773](https://github.com/Agoric/agoric-sdk/issues/6773)
* improved error diagnostic on timer event handler failure ([79a927b](https://github.com/Agoric/agoric-sdk/commit/79a927b71442d4c75673b4de2526692bdb4c02d9)), closes [#6767](https://github.com/Agoric/agoric-sdk/issues/6767)
* Integrate kernel with bundleStore ([338556a](https://github.com/Agoric/agoric-sdk/commit/338556a7712ce676e15a97fc923439ca9c5c931a)), closes [#7197](https://github.com/Agoric/agoric-sdk/issues/7197)
* **xsnap:** Update Moddable SDK and xsnap-native ([#6920](https://github.com/Agoric/agoric-sdk/issues/6920)) ([ddb745b](https://github.com/Agoric/agoric-sdk/commit/ddb745bb1a940cd81dae34c642eb357faca0150b))
* convert swing-store from LMDB to Sqlite ([579a6c7](https://github.com/Agoric/agoric-sdk/commit/579a6c796a47092c4ee880316c7530d07d92c961))
* ensure KindHandle has a tag ([7744d7e](https://github.com/Agoric/agoric-sdk/commit/7744d7ede4a9cfc3317207438192d8375f71b9d7))
* move liveslots and specific tests to a new package ([0921a89](https://github.com/Agoric/agoric-sdk/commit/0921a8903b72cfefdf05a5906bcfb826cac1cc2f)), closes [#6596](https://github.com/Agoric/agoric-sdk/issues/6596)
* move snapstore into SQLite database with the rest of the swingstore ([5578834](https://github.com/Agoric/agoric-sdk/commit/55788342bbffe253dd12e919e005e3d093fd6b65)), closes [#6742](https://github.com/Agoric/agoric-sdk/issues/6742)
* refactor SwingStore APIs to cleanly distinguish kernel facet from host facet ([7126822](https://github.com/Agoric/agoric-sdk/commit/71268220d659469cd583c9c510ed8c1a1661f282))
* relocate snapshot metadata from kvStore to snapStore ([4e0f679](https://github.com/Agoric/agoric-sdk/commit/4e0f679b5f8249e1e9098731a96cc0fd793d5d9d)), closes [#6742](https://github.com/Agoric/agoric-sdk/issues/6742)
* use Sqlite save points for crank commit, integrate activity hash into swing-store ([6613d7e](https://github.com/Agoric/agoric-sdk/commit/6613d7eed8b2ee6f6fc06e1dc06747f80b0f44bd))


### Bug Fixes

* update xsnap snapshot ([c7db179](https://github.com/Agoric/agoric-sdk/commit/c7db1792d5170152c49fd0d21aef23ac39ba9509))
* **liveslots:** allow new Kind upgrade to add new facets ([6bc6694](https://github.com/Agoric/agoric-sdk/commit/6bc6694968e6d2f529e7c91ec1efb11fdff2e2d3)), closes [#7437](https://github.com/Agoric/agoric-sdk/issues/7437)
* **proposals:** observe debtLimitValue ([d1738a4](https://github.com/Agoric/agoric-sdk/commit/d1738a4b3cd24875e6848d2c8fd371314390420a))
* **swingset:** add placeholders for upgrade/stopvat work ([c02253c](https://github.com/Agoric/agoric-sdk/commit/c02253cf94fb5f087e81ac0bb5c1bc5a1bf53587)), closes [#6650](https://github.com/Agoric/agoric-sdk/issues/6650) [#7001](https://github.com/Agoric/agoric-sdk/issues/7001) [#6694](https://github.com/Agoric/agoric-sdk/issues/6694) [#6696](https://github.com/Agoric/agoric-sdk/issues/6696)
* **swingset:** better snapshot scheduling, do BOYD before each ([ec16fa2](https://github.com/Agoric/agoric-sdk/commit/ec16fa2c4fb72a466335055f3d9308cca18ca515)), closes [#7553](https://github.com/Agoric/agoric-sdk/issues/7553) [#7504](https://github.com/Agoric/agoric-sdk/issues/7504)
* **swingset:** close swingstore when shutting down test controller ([70324f6](https://github.com/Agoric/agoric-sdk/commit/70324f67a8756f2694ef326cf6798489d0ad5744))
* **swingset:** factor out getDecidedPromises() ([3efce4e](https://github.com/Agoric/agoric-sdk/commit/3efce4e7c2502cb3f5a2342bd032658eb56c8c1f))
* **swingset:** make slog deliveryNum match transcript position ([a29274b](https://github.com/Agoric/agoric-sdk/commit/a29274bf2852ee612a86c961b185bee3c7587d9d)), closes [#7484](https://github.com/Agoric/agoric-sdk/issues/7484) [#7549](https://github.com/Agoric/agoric-sdk/issues/7549)
* **swingset:** move a bunch of types from swingset to swingset-liveslots ([14f9bb0](https://github.com/Agoric/agoric-sdk/commit/14f9bb00c82c085dc647f23b6c90b26e6a0a6dfd))
* **swingset:** vat-timer now returns branded TimestampRecord ([4254915](https://github.com/Agoric/agoric-sdk/commit/4254915e02b16c8a0355ce652b1fb666f6564562)), closes [#6003](https://github.com/Agoric/agoric-sdk/issues/6003)
* **Swingset:** some ambient types are no more ([c756b29](https://github.com/Agoric/agoric-sdk/commit/c756b2909d11b32d2e95bde3588a90b95af9102d))
* **SwingSet:** Abort-and-unwind vat upgrade upon any internal-delivery failure ([aed1282](https://github.com/Agoric/agoric-sdk/commit/aed1282727a9514d355ff9e6c2d9b43f4c562505)), closes [/github.com/Agoric/agoric-sdk/pull/7244#discussion_r1153633902](https://github.com/Agoric//github.com/Agoric/agoric-sdk/pull/7244/issues/discussion_r1153633902)
* **SwingSet:** Access getDecidedPromises on the correct object ([24016f0](https://github.com/Agoric/agoric-sdk/commit/24016f039898b4149105cc6b1dfe916cbb99e745))
* **SwingSet:** Add BOYD to vat upgrade ([be73588](https://github.com/Agoric/agoric-sdk/commit/be7358869fa7dbefa4b21795b06dd0b8fc68200c)), closes [#7001](https://github.com/Agoric/agoric-sdk/issues/7001)
* **SwingSet:** dedupe `bundleTool.js` with Endo ([49b01bc](https://github.com/Agoric/agoric-sdk/commit/49b01bcbea3937dc0e777f65ecdd7457882b5edb))
* **SwingSet:** increase default snapshotInitial from 2 to 3 ([5e723fa](https://github.com/Agoric/agoric-sdk/commit/5e723fa0fc180957e13e8c22aa340d55cb0542f6)), closes [#7548](https://github.com/Agoric/agoric-sdk/issues/7548)
* Update test snapshots impacted by xsnap version bump ([53ea100](https://github.com/Agoric/agoric-sdk/commit/53ea100030680303cdaf18c8a76012c4af7f9044))
* **SwingSet:** do not request bundles if overridden ([80ce61a](https://github.com/Agoric/agoric-sdk/commit/80ce61ae6958cfe2054628c95dae2832cf6517bb))
* **SwingSet:** Don't send stopVat during upgrade ([5cc47d2](https://github.com/Agoric/agoric-sdk/commit/5cc47d2d8892690f8c1653630b41dd64cc42d73b)), closes [#6650](https://github.com/Agoric/agoric-sdk/issues/6650)
* **SwingSet:** Iterate kpids decided by a vat before removing its data ([517ab28](https://github.com/Agoric/agoric-sdk/commit/517ab2802eff1992a25ec027b111a01b0625da39))
* **SwingSet:** Remove metering notifiers ([#7347](https://github.com/Agoric/agoric-sdk/issues/7347)) ([0c75d7c](https://github.com/Agoric/agoric-sdk/commit/0c75d7cf1a1c54ba67d3d199c0674d0f22fb52ba)), closes [#7324](https://github.com/Agoric/agoric-sdk/issues/7324)
* **swingset-liveslots:** Move promise rejection responsibility into the kernel ([dd29ff3](https://github.com/Agoric/agoric-sdk/commit/dd29ff35c5dc72efbbf7087849182aa7f04b2bb1)), closes [#6694](https://github.com/Agoric/agoric-sdk/issues/6694)
* **swingset-tools:** [replay] add xsnap debug option ([ac90a64](https://github.com/Agoric/agoric-sdk/commit/ac90a644dae776677e6d1c7ddd1bd668672e4ab9))
* **swingset-tools:** [replay] cannot load snapshot without xs-worker ([32b0685](https://github.com/Agoric/agoric-sdk/commit/32b068580030dac77c8de960035efdd909c3ea25))
* **swingset-tools:** [replay] clean up on replay error ([e32c987](https://github.com/Agoric/agoric-sdk/commit/e32c9877d0cad3cb79b93eb4aa30cae2459f3368))
* **swingset-tools:** [replay] combine snapshot logic ([b3ea42a](https://github.com/Agoric/agoric-sdk/commit/b3ea42ab34e18163caf4dbcf5e6be1dfded78856))
* **swingset-tools:** [replay] fix load parallelism ([b83f019](https://github.com/Agoric/agoric-sdk/commit/b83f01991d3aebfe1680b160bb2d826edf548739))
* **swingset-tools:** [replay] fix snapstore and vatKeeper interfaces ([a3ee105](https://github.com/Agoric/agoric-sdk/commit/a3ee105c7be4f1f0b6d3d3e8fc232bdbfdd80138))
* **swingset-tools:** [replay] handle bundle related changes ([f0fa337](https://github.com/Agoric/agoric-sdk/commit/f0fa3372cca9a480da3d6c9d7936254849a0aa4b))
* **swingset-tools:** [replay] sync-up snapStore interface ([fc476ba](https://github.com/Agoric/agoric-sdk/commit/fc476ba72c417c8ed6e0eb01dafb2b392df0dfd1))
* **swingset-tools:** [replay] use fs backed db for snapstore ([acb868d](https://github.com/Agoric/agoric-sdk/commit/acb868d99699c6d075282ea9dfebcfefe01edee9))
* **swingset-tools:** [replay] Use SDK bundles ([d883a8f](https://github.com/Agoric/agoric-sdk/commit/d883a8f483951f15983a79c93ab0db3f13f4d509))
* **swingset-tools:** correct transcriptNum when extracting from slog ([e05e37b](https://github.com/Agoric/agoric-sdk/commit/e05e37ba1c4db5e00dd63e4d3ed98d14e417c25c))
* **swingset-tools:** extract vat transcript ([edbac04](https://github.com/Agoric/agoric-sdk/commit/edbac04166d0a8085c00d3d4194608377da9adc7))
* **swingset-tools:** Sync up slog extract create-vat ([d67bec4](https://github.com/Agoric/agoric-sdk/commit/d67bec4f2c314842ca8657eeed8c4bce679d1b7d))
* add 'v'/'d' virtual/durable annotations to vrefs ([b859e92](https://github.com/Agoric/agoric-sdk/commit/b859e92fe041415d6e34250f672a10ad927aa33e)), closes [#6695](https://github.com/Agoric/agoric-sdk/issues/6695)
* CI failures in other packages ([071bf89](https://github.com/Agoric/agoric-sdk/commit/071bf89a337f39b3cb73ef60649fbe47825806bc))
* clean up types ([6f53f19](https://github.com/Agoric/agoric-sdk/commit/6f53f1915ce21e65fefc2fff900b7d4b947be6b1))
* compat with __hardenTaming__: "unsafe" ([501409b](https://github.com/Agoric/agoric-sdk/commit/501409b0096d4d8cd096a2d79147a886145b9258))
* correct merge goofiness ([be83b2d](https://github.com/Agoric/agoric-sdk/commit/be83b2dc3b3f543ef37e1ea0b612a7fea336d533))
* defendPrototypeKit with consolidated error checking ([#6668](https://github.com/Agoric/agoric-sdk/issues/6668)) ([c7d4223](https://github.com/Agoric/agoric-sdk/commit/c7d422343c9fdfd173b6e756ad2a02577d7c4574))
* eliminate snapStore `root` parameter ([f06a171](https://github.com/Agoric/agoric-sdk/commit/f06a17117ef391d46604a4bc34b185135396a7c5))
* error details use ([#6538](https://github.com/Agoric/agoric-sdk/issues/6538)) ([a70063c](https://github.com/Agoric/agoric-sdk/commit/a70063c6bb89dcd4a64b87c7f5860092c4758215))
* incorporate review feedback ([24896ee](https://github.com/Agoric/agoric-sdk/commit/24896ee9271131d68cd2815028f272fefd1818cd))
* make test-activityhash.. use xs-worker ([c6ecf28](https://github.com/Agoric/agoric-sdk/commit/c6ecf28dd47c73ca132c6d44da86a9af66051739)), closes [#3240](https://github.com/Agoric/agoric-sdk/issues/3240)
* minor tweak to make `sortObjectProperties` use `hasOwn` ([0dd89ab](https://github.com/Agoric/agoric-sdk/commit/0dd89abbb9848d90ac617a2e169bde4c32418a7d)), closes [#5552](https://github.com/Agoric/agoric-sdk/issues/5552)
* move many type definitions from swingset to liveslots ([727143d](https://github.com/Agoric/agoric-sdk/commit/727143d5562498e2e3013c34304f229b4dd11da5))
* move rejectAllPromises from stopVat to kernels-side upgradeVat ([d79623f](https://github.com/Agoric/agoric-sdk/commit/d79623f3fb3b87653dba1c71eb1153711c9d962c)), closes [#6694](https://github.com/Agoric/agoric-sdk/issues/6694)
* Move upgrade-time abandonExports responsibility into the kernel ([66ac657](https://github.com/Agoric/agoric-sdk/commit/66ac657d51d3d1be61ee4a6e9a621a664086ee57)), closes [#6696](https://github.com/Agoric/agoric-sdk/issues/6696)
* prepare for patterns to schematize storage ([#6819](https://github.com/Agoric/agoric-sdk/issues/6819)) ([f0bd3d6](https://github.com/Agoric/agoric-sdk/commit/f0bd3d62c9e480b102fc077997c65d89c0488fa8))
* remove now-unused code from replay-transcript.js ([8139f14](https://github.com/Agoric/agoric-sdk/commit/8139f14a45ccd678309725c54485983dc78833e2))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* rename vivify to prepare ([#6825](https://github.com/Agoric/agoric-sdk/issues/6825)) ([9261e42](https://github.com/Agoric/agoric-sdk/commit/9261e42e677a3fc31f52defc8fc7ae800f098838))
* repair version shear ([59de3ab](https://github.com/Agoric/agoric-sdk/commit/59de3ab131d61a6fe2915adc795f0442a94cb7b6))
* Stop doing object-inspect type checks the hard way ([087aa27](https://github.com/Agoric/agoric-sdk/commit/087aa27f2dfd6444e4cc969956c621b3bf581940)), closes [#7277](https://github.com/Agoric/agoric-sdk/issues/7277)
* update description of "FINALIZED" state ([809f366](https://github.com/Agoric/agoric-sdk/commit/809f3660c083467e76deb1487015cb24205a801d))
* without assertKeyPattern ([#7035](https://github.com/Agoric/agoric-sdk/issues/7035)) ([c9fcd7f](https://github.com/Agoric/agoric-sdk/commit/c9fcd7f82757732435cd96f3377e4fbfb6586ce7))
* **liveslots:** update stale comment about addRecognizableValue ([efa00e4](https://github.com/Agoric/agoric-sdk/commit/efa00e4975d88d19ec1bdc2970aaa5154a6340ec)), closes [#6778](https://github.com/Agoric/agoric-sdk/issues/6778)
* **swing-store:** replace getAllState/etc with a debug facet ([886528c](https://github.com/Agoric/agoric-sdk/commit/886528c3044488da57a80bc47290b031fa0713ce))
* **swingset:** always delete vom.rc key when count=0 ([8b9e9fd](https://github.com/Agoric/agoric-sdk/commit/8b9e9fd8ece2c474ebfba04189b530d4f60650b7))
* **swingset:** clean up endo setup in some test files ([e7b1b89](https://github.com/Agoric/agoric-sdk/commit/e7b1b89ff23572606889ddd574a1a37abc07c989))
* **swingset:** delete unused parts of storageAPI.js ([a3ade8d](https://github.com/Agoric/agoric-sdk/commit/a3ade8dd5b89dc66314c678e78f5b7c5d40f4170))
* **swingset:** delete unused timed-iteration.js ([d35669a](https://github.com/Agoric/agoric-sdk/commit/d35669add817151745fdd79896f2901e1ba32387))
* **swingset:** remove unused worker types: node-subprocess, nodeworker ([bc0722f](https://github.com/Agoric/agoric-sdk/commit/bc0722fa866e0dbececbff1897a1ccb55ee1ad29)), closes [#4884](https://github.com/Agoric/agoric-sdk/issues/4884)
* **swingset:** split two files for upcoming refactoring ([d740d33](https://github.com/Agoric/agoric-sdk/commit/d740d333888bda4b7391b88f9285843bc45ac07a))
* **swingset:** update liveslots imports, depend on liveslots package ([7afce90](https://github.com/Agoric/agoric-sdk/commit/7afce90d08dd7ef4c42a0e21110eb85728302fdd))
* move timer files to new package ([c105bde](https://github.com/Agoric/agoric-sdk/commit/c105bdefff2527a90b3c6b9d80d0462944dd51c3))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* swingset should define these types, not zoe/ERTP ([35a977b](https://github.com/Agoric/agoric-sdk/commit/35a977b2fa3c03bd5292718e318a26e897ff3d04))
* tighten `bindAllMethods` caller types ([15f384f](https://github.com/Agoric/agoric-sdk/commit/15f384f04ed94f0ff51270717e74c1668809c895))
* update all clients of @agoric/time to handle the new home ([5c4fb24](https://github.com/Agoric/agoric-sdk/commit/5c4fb241940c74be6b081718b9350bceba95b9cd))
* **SwingSet:** Restore LRU cache flushing when stopping a vat ([2015a0a](https://github.com/Agoric/agoric-sdk/commit/2015a0a6c6489b1f676e6176afbb17781186eabb)), closes [#6604](https://github.com/Agoric/agoric-sdk/issues/6604)


### Miscellaneous Chores

* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



## [0.31.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.30.3...@agoric/swingset-vat@0.31.0) (2023-02-17)


### Features

* **swingset-tools:** [replay] add some worker stats ([ca821f7](https://github.com/Agoric/agoric-sdk/commit/ca821f70d01d4ef7634c0256236d0fbaa2adfa3a))
* **swingset-tools:** [replay] add syscall divergence analysis ([95c1db6](https://github.com/Agoric/agoric-sdk/commit/95c1db6b39b300d802e1d296b478a8be9b2384e5))
* **swingset-tools:** [replay] better snapshot messages ([c1774cc](https://github.com/Agoric/agoric-sdk/commit/c1774ccd9ebdedcdce44b499c5f7a8ce59cb73ae))
* **swingset-tools:** [replay] convert options to command line parsed ([703b421](https://github.com/Agoric/agoric-sdk/commit/703b42140ac3390f1321c757576e1d1938706b69))
* **swingset-tools:** [replay] force load snapshots ([9a93cb4](https://github.com/Agoric/agoric-sdk/commit/9a93cb460e9b2fd2c0b0bdc7ed83df8d0672d630))
* **swingset-tools:** [replay] force snapshot making on interval ([dcf677a](https://github.com/Agoric/agoric-sdk/commit/dcf677a58582a823b9ecda3d35bfbd3581f9c070))
* **swingset-tools:** [replay] handle various transcript logic versions ([1345156](https://github.com/Agoric/agoric-sdk/commit/1345156eed9d3ade941ea8a345bb63d0c958949b))
* **swingset-tools:** [replay] implement custom compareSyscalls ([176b8aa](https://github.com/Agoric/agoric-sdk/commit/176b8aa74194a3abf4b31dafce6199d14623d795))
* **swingset-tools:** [replay] improve multi worker logic ([3f7ac94](https://github.com/Agoric/agoric-sdk/commit/3f7ac947ebe0c0c84280c7099b1bfa3e04ae7594))
* **swingset-tools:** [replay] keep divergent and explicitly loaded workers ([c7ffd09](https://github.com/Agoric/agoric-sdk/commit/c7ffd09c019f23b143708308ad19925db70b6b22))
* **swingset-tools:** [replay] Option to load snapshots through config ([9a9ea0b](https://github.com/Agoric/agoric-sdk/commit/9a9ea0b794fe1ea6ac34e94563a313acc2a42772))
* **swingset-tools:** [replay] spawn multiple workers ([2b68418](https://github.com/Agoric/agoric-sdk/commit/2b684184d1e291f2e1707eab411244d8154b4f86))
* **swingset-tools:** [replay] use transcriptNum ([2570d0a](https://github.com/Agoric/agoric-sdk/commit/2570d0a19e710c819dad0c45d76c98e7249bedd6))
* **swingset-tools:** [replay] write activity log ([22842cd](https://github.com/Agoric/agoric-sdk/commit/22842cdf7477d03acf55323542472536a9b7b46f))
* **swingset-tools:** extract vat bundles ([1321fed](https://github.com/Agoric/agoric-sdk/commit/1321fed03a17d9c26748372f29b7d2d7c2ec12b8))


### Bug Fixes

* **swingset-tools:** [replay] add xsnap debug option ([552ce27](https://github.com/Agoric/agoric-sdk/commit/552ce27ad12f9555e4bd5b06760f02c1f635d25c))
* **swingset-tools:** [replay] cannot load snapshot without xs-worker ([f7917b9](https://github.com/Agoric/agoric-sdk/commit/f7917b94bc29c3960a2f0b62683d1d1504fccdeb))
* **swingset-tools:** [replay] clean up on replay error ([2af1bfe](https://github.com/Agoric/agoric-sdk/commit/2af1bfe00b0b03af5aab9fcc9412d0a5d270fd7c))
* **swingset-tools:** [replay] fix load parallelism ([6dc6abd](https://github.com/Agoric/agoric-sdk/commit/6dc6abd0d800bc6b0633a5911388b0faf2551d93))
* **swingset-tools:** [replay] sync-up snapStore interface ([bd82be2](https://github.com/Agoric/agoric-sdk/commit/bd82be2ee5c587fe4279aacfe747358b3599bcac))
* **swingset-tools:** correct transcriptNum when extracting from slog ([3deb589](https://github.com/Agoric/agoric-sdk/commit/3deb589037192491d00ac34a503f490ff80c1975))



### [0.30.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.30.2...@agoric/swingset-vat@0.30.3) (2022-12-14)


### Bug Fixes

* **swingset:** workaround XS garbage collection bugs ([#6664](https://github.com/Agoric/agoric-sdk/issues/6664)) ([12e97f1](https://github.com/Agoric/agoric-sdk/commit/12e97f1e7d384c11c76b61de67ee0de30de00fe6))



### [0.30.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.30.1...@agoric/swingset-vat@0.30.2) (2022-10-18)


### Bug Fixes

* **swingset:** only preload maxVatsOnline/2 vats ([ff696dc](https://github.com/Agoric/agoric-sdk/commit/ff696dcc98ac1bc8ca0bbb4acb4339751ba013dd)), closes [#6433](https://github.com/Agoric/agoric-sdk/issues/6433)



### [0.30.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.30.0...@agoric/swingset-vat@0.30.1) (2022-10-08)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.30.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.29.0...@agoric/swingset-vat@0.30.0) (2022-10-05)


### Features

* **SwingSet:** upgrade to superior nestedEvaluate ([fd579c5](https://github.com/Agoric/agoric-sdk/commit/fd579c5644970a7fdf764c0b7befeafb3fb267c1))


### Bug Fixes

* add kernel stats as a slog entry at completion of each block ([8a38c52](https://github.com/Agoric/agoric-sdk/commit/8a38c52a0a4eb665e03fdba7c96e944221ab8bc9)), closes [#4585](https://github.com/Agoric/agoric-sdk/issues/4585)
* avoid __proto__ accessor ([#6349](https://github.com/Agoric/agoric-sdk/issues/6349)) ([eac70a5](https://github.com/Agoric/agoric-sdk/commit/eac70a53c0a9fdc138c7bcce5ba8f61f802dfdee))
* cleanup, update, and refactor slog-to-otel converter ([225f1dd](https://github.com/Agoric/agoric-sdk/commit/225f1dda46ec99dbc47ba39b3a99e278a4c1adbb)), closes [#4585](https://github.com/Agoric/agoric-sdk/issues/4585)



## [0.29.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.28.0...@agoric/swingset-vat@0.29.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move from Schema to Shape terminology (#6072)
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **SwingSet:** Representatives inherit bound methods (#5970)
* **run-protocol:** rename to inter-protocol

### Features

* **swing-store:** Update snapshot telemetry to differentiate new-file vs. existing-file ([73550f3](https://github.com/Agoric/agoric-sdk/commit/73550f3b8d052fcbf79c4cb9725153e31d270726))
* add 'pinBootstrap' swingset configuration option ([131d74d](https://github.com/Agoric/agoric-sdk/commit/131d74d96570ac34feab74e26e682f36fe632dbc)), closes [#5771](https://github.com/Agoric/agoric-sdk/issues/5771)
* add API for configuring kernel & vat options on a running swingset ([14072a3](https://github.com/Agoric/agoric-sdk/commit/14072a379749c28ba16691ab3212394934984b17)), closes [#5237](https://github.com/Agoric/agoric-sdk/issues/5237)
* add config flag to control `fakeDurable` ([4ac9764](https://github.com/Agoric/agoric-sdk/commit/4ac9764148e369515399e090fe5f0ed73e41eeee)), closes [#5489](https://github.com/Agoric/agoric-sdk/issues/5489)
* add fakeDurable option to assist durability conversion ([7c02404](https://github.com/Agoric/agoric-sdk/commit/7c0240402a52ca82c948d9a0b9730824a84b4951)), closes [#5454](https://github.com/Agoric/agoric-sdk/issues/5454)
* allow vats to be marked critical and panic the kernel if a critical vat fails ([9ef4941](https://github.com/Agoric/agoric-sdk/commit/9ef49412b27fc73e3d63bba7bda7a0ee2a387f41)), closes [#4279](https://github.com/Agoric/agoric-sdk/issues/4279)
* canonicalize order of vat & bundle configuration ([f3c347f](https://github.com/Agoric/agoric-sdk/commit/f3c347f7e6b3eeb22d71887bc1ee311131e18642)), closes [#5229](https://github.com/Agoric/agoric-sdk/issues/5229)
* change kernel queue storage manipulations from O(n) to O(1) ([994b0e8](https://github.com/Agoric/agoric-sdk/commit/994b0e8b64e659382e085a1d9d3cb7af068cd766)), closes [#5932](https://github.com/Agoric/agoric-sdk/issues/5932)
* distinctive rejection values for promises severed by vat upgrade ([2be42ca](https://github.com/Agoric/agoric-sdk/commit/2be42ca166d8281f5de2a07c8d7a1327f94ee74d)), closes [#5649](https://github.com/Agoric/agoric-sdk/issues/5649)
* enable collection deletion without swapping in key objects ([8ed6493](https://github.com/Agoric/agoric-sdk/commit/8ed64935fc922881b31c87e451fb2c12b38c0138)), closes [#5053](https://github.com/Agoric/agoric-sdk/issues/5053)
* include GC calls in transcript ([17764ff](https://github.com/Agoric/agoric-sdk/commit/17764ff0bbc0f531f28a1f38229c394d653dbfcc)), closes [#5564](https://github.com/Agoric/agoric-sdk/issues/5564)
* make the vatAdmin vat upgradeable ([d81eeb3](https://github.com/Agoric/agoric-sdk/commit/d81eeb3df771a944fa0b58eb73f9e7b44ef90630)), closes [#5669](https://github.com/Agoric/agoric-sdk/issues/5669) [#5811](https://github.com/Agoric/agoric-sdk/issues/5811)
* Report size and timing data of SnapStore save operations ([f0a6026](https://github.com/Agoric/agoric-sdk/commit/f0a602667b0a5599368170fadc4f95678bfcf711))
* Write makeSnapshot telemetry to slog ([4cdd2f8](https://github.com/Agoric/agoric-sdk/commit/4cdd2f8a07764046c9310218d45ffa16c4aa9e6b)), closes [#6164](https://github.com/Agoric/agoric-sdk/issues/6164)
* **cosmic-swingset:** Add chainStorage interface ([#5385](https://github.com/Agoric/agoric-sdk/issues/5385)) ([109ff65](https://github.com/Agoric/agoric-sdk/commit/109ff65845caaa503b03e2663437f62e7cdc686e)), closes [#4558](https://github.com/Agoric/agoric-sdk/issues/4558)
* **ses-ava:** support full API of Ava ([3b5fd6c](https://github.com/Agoric/agoric-sdk/commit/3b5fd6c103a4a9207eaf2e761b3a096ce78c3d16))
* **swing-store:** Switch to lmdb-js ([89adc87](https://github.com/Agoric/agoric-sdk/commit/89adc87848494e78213d68194357c876b9ae4cf0))
* **swingset:** startVat counts against meterID ([9a8f437](https://github.com/Agoric/agoric-sdk/commit/9a8f43793254fb7fc0393de2f3145b8ac67de94e))
* **SwingSet:** device-mailbox unregisterInboundHandler ([6876f38](https://github.com/Agoric/agoric-sdk/commit/6876f3837d032e3965fa55be48bf9515b055d4e3))
* **SwingSet:** toward a pattern for SwingSet config files ([8da9637](https://github.com/Agoric/agoric-sdk/commit/8da963736b2cf147063787e811b9fe2da0b7e71e))
* rewrite delivery-result processing, rewind failed upgrades ([42d6a2d](https://github.com/Agoric/agoric-sdk/commit/42d6a2dbb046b4a8c315e0f52390ee42e3112cce)), closes [#5344](https://github.com/Agoric/agoric-sdk/issues/5344)


### Bug Fixes

* hoist suspicious nested await to top level ([fa4ab89](https://github.com/Agoric/agoric-sdk/commit/fa4ab893e06d55a5b264b0457ca76e53b4fa5a13)), closes [#6231](https://github.com/Agoric/agoric-sdk/issues/6231)
* Report new metrics in seconds, and do so accurately ([c22309f](https://github.com/Agoric/agoric-sdk/commit/c22309f27aa6d0c327907c08588436972fe0c164))
* Update ava snapshots ([ac4d7ee](https://github.com/Agoric/agoric-sdk/commit/ac4d7ee64760d8e2a6bf24440e772214c543e6d5))
* **swingset:** don't delete heap snapshot if it didn't change ([2cbe3a8](https://github.com/Agoric/agoric-sdk/commit/2cbe3a86d0936d60cd07f6d9eee7efd354986cb4)), closes [#5901](https://github.com/Agoric/agoric-sdk/issues/5901)
* **swingset:** don't un-expose 'gc', to stop intermittent test failures ([c4f7038](https://github.com/Agoric/agoric-sdk/commit/c4f7038438845b5ec5e5daa362298e9a4923814f)), closes [#6028](https://github.com/Agoric/agoric-sdk/issues/6028)
* **swingset:** re-enable refcount test ([c863bdc](https://github.com/Agoric/agoric-sdk/commit/c863bdcd4aa826ec8faf054e8e80dbd6e17241f0)), closes [#5892](https://github.com/Agoric/agoric-sdk/issues/5892) [#5892](https://github.com/Agoric/agoric-sdk/issues/5892)
* **SwingSet:** Add durability to vat-vattp network host objects ([fcd6c53](https://github.com/Agoric/agoric-sdk/commit/fcd6c530b1b2c0cc50de4fea68443d7f221332cf))
* **SwingSet:** Add durability to vat-vattp objects ([7c22668](https://github.com/Agoric/agoric-sdk/commit/7c2266864e5e66e71d626fdecf7fd2f7936fbb98)), closes [#5667](https://github.com/Agoric/agoric-sdk/issues/5667)
* **SwingSet:** Allow vat-vattp to persist the mailbox device ([4bf7c79](https://github.com/Agoric/agoric-sdk/commit/4bf7c798afc24e19c2776ae5668afd97387bc775))
* **SwingSet:** Apply netstring limit to xsnap workers ([f8365b2](https://github.com/Agoric/agoric-sdk/commit/f8365b26dd79967895a4d88966521d067b982206))
* **SwingSet:** liveslots and supervisor errors to console.warn ([#6136](https://github.com/Agoric/agoric-sdk/issues/6136)) ([78c1dad](https://github.com/Agoric/agoric-sdk/commit/78c1dadb93a2413ac16e2cd603163ee6437818b3))
* **SwingSet:** Representatives inherit bound methods ([#5970](https://github.com/Agoric/agoric-sdk/issues/5970)) ([ba1ed62](https://github.com/Agoric/agoric-sdk/commit/ba1ed62062a63862e2eecb598b0bd1d2ac828e1f))
* **SwingSet:** transcript tools support snapshot save and load ([#6177](https://github.com/Agoric/agoric-sdk/issues/6177)) ([fa022f1](https://github.com/Agoric/agoric-sdk/commit/fa022f1ed1c68e45b8271f7fb4ca91951ef1ae1a))
* also handle syscall.exit ([24ae1f0](https://github.com/Agoric/agoric-sdk/commit/24ae1f03ee77538ff09d356951aa3b09c9637bc3))
* also handle values serialized to the vatstore ([2e9f836](https://github.com/Agoric/agoric-sdk/commit/2e9f836cc20c6b2778136b3768cbd3ddd0064a56))
* alter slogger so it can't throw errors ([c82c39e](https://github.com/Agoric/agoric-sdk/commit/c82c39e5e79756314ebd79c7dc98b5be7dfe8804)), closes [#5463](https://github.com/Agoric/agoric-sdk/issues/5463)
* Better pattern mismatch diagnostics ([#5906](https://github.com/Agoric/agoric-sdk/issues/5906)) ([cf97ba3](https://github.com/Agoric/agoric-sdk/commit/cf97ba310fb5eb5f1ff5946d7104fdf27bcccfd4))
* eliminate `fakeDurable` and change global durability rules to match ([2133250](https://github.com/Agoric/agoric-sdk/commit/2133250561161013dd0f06351bbb05f6640c8b6c)), closes [#5593](https://github.com/Agoric/agoric-sdk/issues/5593)
* ensure that errors which escape a crank panic the kernel ([5ebdc7b](https://github.com/Agoric/agoric-sdk/commit/5ebdc7be580552264a46c1155f2515a663c81cad)), closes [#5565](https://github.com/Agoric/agoric-sdk/issues/5565)
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* Guard netstring decode with an optional max size ([2a2ec0f](https://github.com/Agoric/agoric-sdk/commit/2a2ec0fde3881d52cfa038b0e9f0990fae715e85)), closes [#3242](https://github.com/Agoric/agoric-sdk/issues/3242)
* make eslint shut up about unhandled promises ([16a0589](https://github.com/Agoric/agoric-sdk/commit/16a058955ba2b49b80c4cca8e9aae8fa196a395c)), closes [#5535](https://github.com/Agoric/agoric-sdk/issues/5535)
* patch to suppress turn tracking diagnostics ([#5892](https://github.com/Agoric/agoric-sdk/issues/5892)) ([18cfe7a](https://github.com/Agoric/agoric-sdk/commit/18cfe7a5e2d80434dfc37ea3175d23b32b34fbc7))
* patterns impose resource limits ([#6057](https://github.com/Agoric/agoric-sdk/issues/6057)) ([548c053](https://github.com/Agoric/agoric-sdk/commit/548c053dbe779fe8cede2ca5651c146c9fee2a8e))
* provide policyInput=none for non-delivering cranks ([9cbb386](https://github.com/Agoric/agoric-sdk/commit/9cbb38614e62e3f728990da7c56bc2dd1a3d1162))
* require that durable object kind shape be conserved across upgrades ([feb63ee](https://github.com/Agoric/agoric-sdk/commit/feb63eedfdfd408191a89d3108501610cbe74cbe)), closes [#5662](https://github.com/Agoric/agoric-sdk/issues/5662)
* serialize all tests in test-terminate.js ([890245e](https://github.com/Agoric/agoric-sdk/commit/890245ea41d8e44be62ddf6128898937c73d7793)), closes [#5782](https://github.com/Agoric/agoric-sdk/issues/5782)
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **swingset:** add 'microtime' dependency ([0d5bc3e](https://github.com/Agoric/agoric-sdk/commit/0d5bc3eaf9d3911728141334d10252ec31cbf8f0))
* **swingset:** avoid relying on dependency patch ([b14cdab](https://github.com/Agoric/agoric-sdk/commit/b14cdab659169fe23a8c34509f7b745ea5ea7fe1))
* **swingset:** close store iterators when clearing them ([fc4d3e9](https://github.com/Agoric/agoric-sdk/commit/fc4d3e9b566c5df8abe3f543fd2da3ffdffacc45))
* **swingset:** decrement kernelObjects stat when deleting an object ([c123945](https://github.com/Agoric/agoric-sdk/commit/c12394530715e81478457de3c8630b36197eb8fd)), closes [#5652](https://github.com/Agoric/agoric-sdk/issues/5652)
* **swingset:** don't double-allocate durable object vrefs ([a593eae](https://github.com/Agoric/agoric-sdk/commit/a593eae376bf6879462915f820003bd67c03ab08)), closes [#5725](https://github.com/Agoric/agoric-sdk/issues/5725)
* **swingset:** fix handling of promises in virtual data ([f6e65b6](https://github.com/Agoric/agoric-sdk/commit/f6e65b6f497a35e50d810a23e8c5a0d5d86c741d)), closes [#5106](https://github.com/Agoric/agoric-sdk/issues/5106) [#5106](https://github.com/Agoric/agoric-sdk/issues/5106)
* **swingset:** handle getKeys iterator interruption ([7e1cef8](https://github.com/Agoric/agoric-sdk/commit/7e1cef86bc04f30902e52b6ba0f257a69e8bc47c))
* **swingset:** hasher types ([03a27e4](https://github.com/Agoric/agoric-sdk/commit/03a27e49dfe17280338b45ae2c0c5e2acef05f4e))
* **swingset:** improve timer device ([7903445](https://github.com/Agoric/agoric-sdk/commit/79034456b010f58aa1f2755f0eb4a2869a8c0e3d)), closes [#4297](https://github.com/Agoric/agoric-sdk/issues/4297)
* **swingset:** Propagate iterator close errors ([3bd1821](https://github.com/Agoric/agoric-sdk/commit/3bd1821223be6e1d3840eacaed9a434ff6fa8c11))
* **swingset:** record full VatSyscallResult in transcript, even errors ([55ca498](https://github.com/Agoric/agoric-sdk/commit/55ca4981a22e3b4d591560df5620cbcaa93cbe64)), closes [#5511](https://github.com/Agoric/agoric-sdk/issues/5511)
* **SwingSet:** Make vat-vattp durability more complete ([4b4d02f](https://github.com/Agoric/agoric-sdk/commit/4b4d02f19c72ed510c48940f96a6fc19520ff173))
* **xsnap:** Use xsnap with fixed timestamps ([#6151](https://github.com/Agoric/agoric-sdk/issues/6151)) ([9ba7842](https://github.com/Agoric/agoric-sdk/commit/9ba78424a4bd587d0009a6816b7ffcedd5d7f972))
* record XS snapshots and file sizes to slog and console ([5116ebb](https://github.com/Agoric/agoric-sdk/commit/5116ebb4bae4acfc62475bfee1f4277fc2135d6f)), closes [#5419](https://github.com/Agoric/agoric-sdk/issues/5419)
* show more stacks ([#5980](https://github.com/Agoric/agoric-sdk/issues/5980)) ([7e22057](https://github.com/Agoric/agoric-sdk/commit/7e220575af0e5b0607d821675c57a3714f48fd65))
* time as branded value ([#5821](https://github.com/Agoric/agoric-sdk/issues/5821)) ([34078ff](https://github.com/Agoric/agoric-sdk/commit/34078ff4b34a498f96f3cb83df3a0b930b98bbec))
* **swingset:** fix transcript extract/replay tools ([56e3d7c](https://github.com/Agoric/agoric-sdk/commit/56e3d7c46e956e655ab7890304acdaca5a88c236)), closes [#5600](https://github.com/Agoric/agoric-sdk/issues/5600) [#5602](https://github.com/Agoric/agoric-sdk/issues/5602)
* **swingset:** make terminateVat() async ([bd93950](https://github.com/Agoric/agoric-sdk/commit/bd93950967d42b1d18a82e529ea080afb826360f))
* **swingset:** remove xs-worker-no-gc and gcEveryCrank ([b3c7c64](https://github.com/Agoric/agoric-sdk/commit/b3c7c64f5070293a747e6bef37acc19242b1ab29)), closes [#4160](https://github.com/Agoric/agoric-sdk/issues/4160) [#5600](https://github.com/Agoric/agoric-sdk/issues/5600)
* **swingset:** stop using a persistent kernel bundle ([ec2c30d](https://github.com/Agoric/agoric-sdk/commit/ec2c30d0ea57ce4cfffcdbcec13ad8b8188f564e)), closes [#4376](https://github.com/Agoric/agoric-sdk/issues/4376) [#5703](https://github.com/Agoric/agoric-sdk/issues/5703) [#5679](https://github.com/Agoric/agoric-sdk/issues/5679)
* **Swingset:** add crank details to slog event ([be1f443](https://github.com/Agoric/agoric-sdk/commit/be1f443bdfd49325316607142f116ca3153e296f))
* **swingset-tools:** inter-protocol path ([af6205c](https://github.com/Agoric/agoric-sdk/commit/af6205c2067bea38d9e1279e09d9581d825640d6))
* enforce size limits on syscalls containing capdata ([7ee2b84](https://github.com/Agoric/agoric-sdk/commit/7ee2b844d825f22a6fb994036902a51a7337075c)), closes [#3242](https://github.com/Agoric/agoric-sdk/issues/3242)
* incorporate review feedback ([e21aa09](https://github.com/Agoric/agoric-sdk/commit/e21aa0974a823849d25c014dd902db8aeeea21a8))
* shutdown controller after tests ([93191e3](https://github.com/Agoric/agoric-sdk/commit/93191e33783f6a3286b55e3496fa0d7024690dd1))
* **swingset:** fix unhandled rejection in test-liveslots ([eaa6362](https://github.com/Agoric/agoric-sdk/commit/eaa63629db8378e75cbc04ac978bc9a90f4feb35)), closes [#5623](https://github.com/Agoric/agoric-sdk/issues/5623)
* **swingset:** move upgrade() vatParameters into options bag ([d26b872](https://github.com/Agoric/agoric-sdk/commit/d26b872b5dfd222fcf204d68be431616bcce00f9)), closes [#5345](https://github.com/Agoric/agoric-sdk/issues/5345)
* **swingset:** simulate full response for gc syscalls ([#5563](https://github.com/Agoric/agoric-sdk/issues/5563)) ([c48b8dd](https://github.com/Agoric/agoric-sdk/commit/c48b8dd05cf4ef9ce19676e4f3621f30c7a65f2c))
* **swingset:** use dynamic vat options.name for the xsnap no-op argument ([113fccc](https://github.com/Agoric/agoric-sdk/commit/113fcccf5ed8ecb26fbb67a2779feabc2b1b34fd)), closes [#5516](https://github.com/Agoric/agoric-sdk/issues/5516)
* **swingset:** use gettimeofday() in the slogfile, not CLOCK_MONOTONIC ([956a68b](https://github.com/Agoric/agoric-sdk/commit/956a68b7bbbe3f505ae0bd3eb5c7344fb3d022fa)), closes [#5152](https://github.com/Agoric/agoric-sdk/issues/5152) [#5152](https://github.com/Agoric/agoric-sdk/issues/5152)
* **swingset-vat:** Fix test representation of asyncIterator ([4c5efee](https://github.com/Agoric/agoric-sdk/commit/4c5efee99837c0f0a30d100220bbf0f7a28eea60))
* correct inadvertent exposure of `sizeInternal` method on public API of stores ([307f65d](https://github.com/Agoric/agoric-sdk/commit/307f65d47a23661b741ae478e94d54d9de5cbec4)), closes [#5464](https://github.com/Agoric/agoric-sdk/issues/5464)
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))
* throw error on attempt to reuse a kind handle ([5ac8cb1](https://github.com/Agoric/agoric-sdk/commit/5ac8cb1641fe64590d04b3a27668e2001168cd9f)), closes [#5628](https://github.com/Agoric/agoric-sdk/issues/5628)


### Performance Improvements

* **swing-store:** Improve the efficiency of writing snapshots ([ef78e7d](https://github.com/Agoric/agoric-sdk/commit/ef78e7dfb3edc7c74f4fa86804c9204e977d5680)), closes [#6225](https://github.com/Agoric/agoric-sdk/issues/6225)


### Code Refactoring

* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))
* **store:** move from Schema to Shape terminology ([#6072](https://github.com/Agoric/agoric-sdk/issues/6072)) ([757b887](https://github.com/Agoric/agoric-sdk/commit/757b887edd2d41960fadc86d4900ebde55729867))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



## [0.28.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.27.0...@agoric/swingset-vat@0.28.0) (2022-05-28)


### Features

* **swingset:** add vatAdminService.getBundleIDByName() ([1ab58fc](https://github.com/Agoric/agoric-sdk/commit/1ab58fc93fff59f385c4ae609b42cdc4c4ea69bd)), closes [#4374](https://github.com/Agoric/agoric-sdk/issues/4374)
* serialize method names in message encoding ([1de86c5](https://github.com/Agoric/agoric-sdk/commit/1de86c58f0813c73ecc2fcdde385f3d106a0b115)), closes [#2481](https://github.com/Agoric/agoric-sdk/issues/2481)
* support symbol-named methods in virtual objects ([80624d4](https://github.com/Agoric/agoric-sdk/commit/80624d466a914e5e6ddb25c5ee99cbc68701988b)), closes [#5359](https://github.com/Agoric/agoric-sdk/issues/5359)
* **swingset:** expose total queues length ([7959eb4](https://github.com/Agoric/agoric-sdk/commit/7959eb4010dcd1711252785038714f78b47ced98))
* **swingset:** keep track of promise queues length ([4a3bb5d](https://github.com/Agoric/agoric-sdk/commit/4a3bb5d32a39846bc6a29460b7a30a3871d08ab4))
* **swingset:** Make stats upgrade behave sanely ([a1b1136](https://github.com/Agoric/agoric-sdk/commit/a1b1136a6f749b599b4a9f55085d5b530fba7bc0))
* **swingset:** Split kernelStats into local and consensus ([d16507d](https://github.com/Agoric/agoric-sdk/commit/d16507d149fbd6f166d5293ee9555d72a09c275a))


### Bug Fixes

* make legibilizeValue behave better given weird input ([05ec0fe](https://github.com/Agoric/agoric-sdk/commit/05ec0fe572823c71e124e70c0ec4116a5006a9f3)), closes [#5409](https://github.com/Agoric/agoric-sdk/issues/5409)
* **swingset:** missing await for installBundle ([8c89c57](https://github.com/Agoric/agoric-sdk/commit/8c89c57fa5a98037b778a83caa3b2a194800259e))
* array.map that should be array.forEach ([#5331](https://github.com/Agoric/agoric-sdk/issues/5331)) ([63fe8e4](https://github.com/Agoric/agoric-sdk/commit/63fe8e4d41bc2e9b01efdd3358283dc90ea5dcfc))
* bug in fake virtual stuff due to recent liveslots additions ([db71bd7](https://github.com/Agoric/agoric-sdk/commit/db71bd7c408bcd4b080d049df80545f2d7a74973)), closes [#5283](https://github.com/Agoric/agoric-sdk/issues/5283)



## [0.27.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.26.0...@agoric/swingset-vat@0.27.0) (2022-05-09)


### Features

* **swingset:** allow buildRootObject to return a Promise ([169cbc2](https://github.com/Agoric/agoric-sdk/commit/169cbc2765d72ec300a25ebd38761e9c880f0d5a)), closes [#5246](https://github.com/Agoric/agoric-sdk/issues/5246)
* **swingset:** prevent imported promises as result ([5eec3a0](https://github.com/Agoric/agoric-sdk/commit/5eec3a0e2c8ca2fa91a504691cac0ec3ba5bd240))
* **swingset:** requeue pipelined promises ([bbe9b12](https://github.com/Agoric/agoric-sdk/commit/bbe9b12f45b367b68f1f8a0169e6e7706a46147c))
* **swingset:** send to promise avoid trip through run-queue ([4acc748](https://github.com/Agoric/agoric-sdk/commit/4acc74821cf5cbfbf6e27489ce44dab7290f568b))
* **SwingSet:** implement `console` event `source` property ([e96cd5c](https://github.com/Agoric/agoric-sdk/commit/e96cd5cb5b078269f4a2b79163400e91b9853dda))
* first pass at VO and DVO test harnesses ([272bf67](https://github.com/Agoric/agoric-sdk/commit/272bf67180b9ae14a64b37fa97170e5381312cd5)), closes [#4997](https://github.com/Agoric/agoric-sdk/issues/4997)
* store metadata for each virtual object kind, to each scanning on vat stop or restart ([4c3f5cc](https://github.com/Agoric/agoric-sdk/commit/4c3f5cc352e15ec9bf5f2fed61d3f778c0335f51)), closes [#5262](https://github.com/Agoric/agoric-sdk/issues/5262)
* **vault:** governance upgrade of liquidation ([#5211](https://github.com/Agoric/agoric-sdk/issues/5211)) ([35e1b7d](https://github.com/Agoric/agoric-sdk/commit/35e1b7d0b7df2508adf0d46a83944e94ab95951a))
* implement durable promise watchers ([ce55851](https://github.com/Agoric/agoric-sdk/commit/ce558515467e869e784260f5478802835c5eb9cf)), closes [#5006](https://github.com/Agoric/agoric-sdk/issues/5006)
* virtualize pools for the AMM. ([#5187](https://github.com/Agoric/agoric-sdk/issues/5187)) ([e2338e9](https://github.com/Agoric/agoric-sdk/commit/e2338e98b64b59920a13faeacb29ae7868c3693b))
* **swingset-vat:** Include alleged bundleID in checkBundle diagnostics ([6585693](https://github.com/Agoric/agoric-sdk/commit/658569307d82cb1eb393894ee005425f82f14148))


### Bug Fixes

* conform to Agoric arrow-only function style ([9e5dd0d](https://github.com/Agoric/agoric-sdk/commit/9e5dd0d79e1429848bdd65b2d0e17c24627fceb4))
* eliminate vatstore vat power ([dd4def3](https://github.com/Agoric/agoric-sdk/commit/dd4def34c99e979e7625cb6be11141a0f80db61d))
* guard against oversized collection keys ([690c159](https://github.com/Agoric/agoric-sdk/commit/690c1595eb8ceb392ff5f5569fd87d3883f4732d)), closes [#5277](https://github.com/Agoric/agoric-sdk/issues/5277)
* persistently track transcript start position for transcript continuity across upgrades ([3c69350](https://github.com/Agoric/agoric-sdk/commit/3c69350052d54554ac57d9040f0e621b482ab786)), closes [#3293](https://github.com/Agoric/agoric-sdk/issues/3293)
* review feedback ([388871e](https://github.com/Agoric/agoric-sdk/commit/388871eb87a40d181124c4edce0fd74f7c6eeb87))
* **swingset:** disallow fulfillment to promise ([b1bbdf9](https://github.com/Agoric/agoric-sdk/commit/b1bbdf9e8e45e1f4683b66c7e7927f89534c7ca0))
* **swingset:** Handle relative paths for XSNAP_TEST_RECORD ([7181141](https://github.com/Agoric/agoric-sdk/commit/7181141e382e1c3bc0600789f841913424ec10da))
* **swingset:** Test vats save creation options ([6f21236](https://github.com/Agoric/agoric-sdk/commit/6f21236daeec657d394851edcfddf39f3ff0db35))



## [0.26.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.25.1...@agoric/swingset-vat@0.26.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* split single- and multi-faceted VO definitions into their own functions ([fcf293a](https://github.com/Agoric/agoric-sdk/commit/fcf293a4fcdf64bf30b377c7b3fb8b728efbb4af)), closes [#5093](https://github.com/Agoric/agoric-sdk/issues/5093)
* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
* **swingset:** add "device hooks" ([fad2812](https://github.com/Agoric/agoric-sdk/commit/fad28126bcd0a853c0315fa47858fa303d692e2f)), closes [#4726](https://github.com/Agoric/agoric-sdk/issues/4726)
* **swingset:** add syscall.abandonExports ([4bd1a8b](https://github.com/Agoric/agoric-sdk/commit/4bd1a8b3c03966f0970c7055609e24929d8ac01c)), closes [#4951](https://github.com/Agoric/agoric-sdk/issues/4951) [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** allow object refs in create/upgrade/terminate vat ([4e120bc](https://github.com/Agoric/agoric-sdk/commit/4e120bce090af7243daed069fbc9d2466726b7bf)), closes [#4588](https://github.com/Agoric/agoric-sdk/issues/4588) [#4381](https://github.com/Agoric/agoric-sdk/issues/4381) [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** get a small upgrade to work ([a7d996b](https://github.com/Agoric/agoric-sdk/commit/a7d996b618e85ab59ee5c318ff13b30fa0442782)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* implement multifaceted virtual objects ([0696866](https://github.com/Agoric/agoric-sdk/commit/0696866ae04375b0f8680d55d4151dce1ed99b60)), closes [#3834](https://github.com/Agoric/agoric-sdk/issues/3834)
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)
* implement vat baggage ([032486b](https://github.com/Agoric/agoric-sdk/commit/032486be7623719cd60801d27e72315c22d3db84)), closes [#4325](https://github.com/Agoric/agoric-sdk/issues/4325) [#4382](https://github.com/Agoric/agoric-sdk/issues/4382) [#3062](https://github.com/Agoric/agoric-sdk/issues/3062) [#1848](https://github.com/Agoric/agoric-sdk/issues/1848) [#3062](https://github.com/Agoric/agoric-sdk/issues/3062) [#4325](https://github.com/Agoric/agoric-sdk/issues/4325) [#3062](https://github.com/Agoric/agoric-sdk/issues/3062)
* **SwingSet:** report empty cranks to run policy ([5b7a694](https://github.com/Agoric/agoric-sdk/commit/5b7a694c6291c45e24ec1bc8f8e5eeacca0ef8c5))
* **SwingSet:** Split acceptance queue processing into its own crank ([d63bce5](https://github.com/Agoric/agoric-sdk/commit/d63bce57ec61a26f2049312ac89a46e6549e5a0a))
* **swingset-vat:** Temporary mutable bundle protection ([1021a37](https://github.com/Agoric/agoric-sdk/commit/1021a37db58f2c9171f4c8274a28dd2ba3a0a355))


### Bug Fixes

* **network:** make `bind` idempotent ([71b8e12](https://github.com/Agoric/agoric-sdk/commit/71b8e121d2ee82913465b04a9e8fe0a89903434b))
* **swingset:** abandon/delete most non-durables during stopVat() ([1cfbeaa](https://github.com/Agoric/agoric-sdk/commit/1cfbeaa3c925d0f8502edfb313ecb12a1cab5eac)), closes [#5053](https://github.com/Agoric/agoric-sdk/issues/5053) [#5058](https://github.com/Agoric/agoric-sdk/issues/5058) [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** disable metering on both initial and from-snapshot workers ([4d0b78d](https://github.com/Agoric/agoric-sdk/commit/4d0b78da674721398ece5250fb9d3a2d851e1406)), closes [#5040](https://github.com/Agoric/agoric-sdk/issues/5040)
* **swingset:** fix two doMoreGC-tracking bugs ([1247bf9](https://github.com/Agoric/agoric-sdk/commit/1247bf9dccab1f84bfda74efab8502767deea54e)), closes [#5044](https://github.com/Agoric/agoric-sdk/issues/5044)
* **swingset:** only ceaseRecognition facets on virtual objects ([1a4fb39](https://github.com/Agoric/agoric-sdk/commit/1a4fb39de5b10b15de7aac975583ee9472231ac5)), closes [#5113](https://github.com/Agoric/agoric-sdk/issues/5113)
* allocate ID number from counters that are kept in persistent storage ([a57f1b7](https://github.com/Agoric/agoric-sdk/commit/a57f1b7a5a3996437f98edaeadc0b6ff9195071e)), closes [#4730](https://github.com/Agoric/agoric-sdk/issues/4730)
* correct bugs due to weird & mistaken buildRootObject usage ([990e7d8](https://github.com/Agoric/agoric-sdk/commit/990e7d88a5c24bb077f349517139c8aa2d5f536a))
* eliminate the propertyNames Set and believe the instance about what props it has ([4995b0e](https://github.com/Agoric/agoric-sdk/commit/4995b0e6dbbfe21e5b331122661a472b3f48324a)), closes [#4935](https://github.com/Agoric/agoric-sdk/issues/4935)
* Encode Passables, not just keys ([#4470](https://github.com/Agoric/agoric-sdk/issues/4470)) ([715950d](https://github.com/Agoric/agoric-sdk/commit/715950d6bfcbe6bc778b65a256dc5d26299172db))
* implement store snapshot ([#5007](https://github.com/Agoric/agoric-sdk/issues/5007)) ([dbb5400](https://github.com/Agoric/agoric-sdk/commit/dbb5400fe5e0cbdae81b64bde97315d541265cc4))
* incorporate review feedback ([7d48c55](https://github.com/Agoric/agoric-sdk/commit/7d48c55076d7709ce21ae56ef3a50b2a82aec366))
* keep weak store inverse index on disk ([b6f8bc0](https://github.com/Agoric/agoric-sdk/commit/b6f8bc0f5c942e0b052e97c311d0a3ee988bdc14)), closes [#4834](https://github.com/Agoric/agoric-sdk/issues/4834)
* release weak map values when keys get GC'd ([077da67](https://github.com/Agoric/agoric-sdk/commit/077da670d41199320c865beaaef68291a12abf7e))
* **swingset:** add stub vat-upgrade calls (always fails) ([250a3e2](https://github.com/Agoric/agoric-sdk/commit/250a3e2fc704f221e2f26e956a55fae850fdd4d0)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** delete json-stable-stringify.js ([2923d6d](https://github.com/Agoric/agoric-sdk/commit/2923d6db3ec74579cff24a643069274c4af9b126))
* **swingset:** deliver startVat to setup() vats ([171409f](https://github.com/Agoric/agoric-sdk/commit/171409f8818727e2c87cc5eff2603167f504e8f3)), closes [#4637](https://github.com/Agoric/agoric-sdk/issues/4637)
* **swingset:** deliver vatParameters in startVat() ([d1f4918](https://github.com/Agoric/agoric-sdk/commit/d1f49186a8833a5f3b60b8cddad0918dfd524f08)), closes [#4381](https://github.com/Agoric/agoric-sdk/issues/4381) [#4766](https://github.com/Agoric/agoric-sdk/issues/4766)
* **swingset:** initializeKindHandleKind early enough to support durables ([ae91fff](https://github.com/Agoric/agoric-sdk/commit/ae91fff14f4999725d137621ea8bf4aa1b51afc1)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** initializeStoreKindInfo() earlier, unconditionally ([3086b3d](https://github.com/Agoric/agoric-sdk/commit/3086b3d0c810b300634ef5da3645e56b8e360a49))
* **swingset:** insist all durable kinds are reconnected by new version ([5908035](https://github.com/Agoric/agoric-sdk/commit/59080359937f7ac20bf40a76c818878e6abd71b3)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** merge bundle/vat-admin devices, add waitForBundleCap() ([019ef20](https://github.com/Agoric/agoric-sdk/commit/019ef20f988940591738497262f59f18b1cbbfb5)), closes [#4521](https://github.com/Agoric/agoric-sdk/issues/4521) [#4566](https://github.com/Agoric/agoric-sdk/issues/4566)
* **swingset:** perform comms init during startVat, reduce DB reads ([f3550ff](https://github.com/Agoric/agoric-sdk/commit/f3550ff35515319aadcf9f3b5db4956c5ebaa5d7)), closes [#4637](https://github.com/Agoric/agoric-sdk/issues/4637)
* **swingset:** startVat(vatParameters) are now capdata ([4d6d266](https://github.com/Agoric/agoric-sdk/commit/4d6d26652382a96834bed0c20fba2638490eb500)), closes [#4381](https://github.com/Agoric/agoric-sdk/issues/4381)
* **swingset:** stopVat rejects lingering promises ([7d1e021](https://github.com/Agoric/agoric-sdk/commit/7d1e0219e7c4fdb3e8ce9cb72be552cfa43d13a8)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** upgrade provides vatID, calls stopVat ([6170cd5](https://github.com/Agoric/agoric-sdk/commit/6170cd556901cc76cc809f94acfc2da130af5dbd)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **swingset:** use a Set to prevent double-retire bug ([3d8916a](https://github.com/Agoric/agoric-sdk/commit/3d8916a79e9a30b7e610d5cd1917b2f6c5ee6bb5)), closes [#4978](https://github.com/Agoric/agoric-sdk/issues/4978)
* **Swingset:** add no-op dispatch.stopVat ([7e51bbf](https://github.com/Agoric/agoric-sdk/commit/7e51bbf7c373abb575121ae7f8dd3e1518630599)), closes [#1848](https://github.com/Agoric/agoric-sdk/issues/1848)
* **SwingSet:** report but don't crash on unhandled rejections ([aa193de](https://github.com/Agoric/agoric-sdk/commit/aa193de1aa87ff09f279a376aa8ac988aa2088de))
* liveslots: initialize counters in startVat, not on-demand ([#4926](https://github.com/Agoric/agoric-sdk/issues/4926)) ([d9d09f1](https://github.com/Agoric/agoric-sdk/commit/d9d09f1813101e21a2342bf121ccdceb11c2a5da)), closes [#4730](https://github.com/Agoric/agoric-sdk/issues/4730)
* remove possible spurious loss of slotToVal entries on export retirement ([fb5585e](https://github.com/Agoric/agoric-sdk/commit/fb5585e5caf6ac0d269dc829f4206637e4636929)), closes [#3978](https://github.com/Agoric/agoric-sdk/issues/3978)
* rip out the remainder of consensusMode ([744b561](https://github.com/Agoric/agoric-sdk/commit/744b561016567a1c6a82392bcb8a86e02f35b7b1))
* virtualize payments, purses, ledger ([#4618](https://github.com/Agoric/agoric-sdk/issues/4618)) ([dfeda1b](https://github.com/Agoric/agoric-sdk/commit/dfeda1bd7d8ca954b139d8dedda0624b924b8d81))
* **SwingSet:** Fix test-controller regression from [#4575](https://github.com/Agoric/agoric-sdk/issues/4575) ([89a2ca5](https://github.com/Agoric/agoric-sdk/commit/89a2ca503fc5810b4c4ef96703b7e320c8c914bc))
* **SwingSet:** remove `consensusMode` flip-flop ([0dc32bb](https://github.com/Agoric/agoric-sdk/commit/0dc32bb55a535bdac12b2f0667885e61747241fd))
* **swingset): initializeKernel(:** set iface of vat roots to 'root' ([f0f9ef0](https://github.com/Agoric/agoric-sdk/commit/f0f9ef0fc79be5ce34e4172398fd2eb0597d5bc6))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.25.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.25.0...@agoric/swingset-vat@0.25.1) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)
* run vat creation and initialization in a crank to access to syscall and transcript logging ([2218e07](https://github.com/Agoric/agoric-sdk/commit/2218e07437a168226666fbb67b2158937cc30372)), closes [#2910](https://github.com/Agoric/agoric-sdk/issues/2910)



## [0.25.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.24.1...@agoric/swingset-vat@0.25.0) (2022-02-21)


### ⚠ BREAKING CHANGES

* **SwingSet:** fill out addresses in `attempt.accept`

### Features

* **swingset:** devices.bundle, install-bundle, bundlecaps, createVat(bundlecap) ([1c39ebd](https://github.com/Agoric/agoric-sdk/commit/1c39ebd329cc2405635380b8199d7be0eadbd158)), closes [#4372](https://github.com/Agoric/agoric-sdk/issues/4372) [#3269](https://github.com/Agoric/agoric-sdk/issues/3269) [#4373](https://github.com/Agoric/agoric-sdk/issues/4373)
* support element deletion during iteration over a store ([8bb9770](https://github.com/Agoric/agoric-sdk/commit/8bb97702fd478b0b47e2d5454373e80765042106)), closes [#4503](https://github.com/Agoric/agoric-sdk/issues/4503)
* **ibc:** reimplement `relativeTimeoutNs`, per `ibc-go` ([4673493](https://github.com/Agoric/agoric-sdk/commit/4673493df11f51e9aa018b0ded9632776759f1ee))
* **swingset:** support raw devices ([e74cf17](https://github.com/Agoric/agoric-sdk/commit/e74cf179c096ff83f5d373a9f57fa071c9bef966)), closes [#1346](https://github.com/Agoric/agoric-sdk/issues/1346) [#1346](https://github.com/Agoric/agoric-sdk/issues/1346)
* **SwingSet:** allow `slogSender` to process all slog messages ([ca4b5bc](https://github.com/Agoric/agoric-sdk/commit/ca4b5bc74068855c3c18908238c992440621622b))
* **SwingSet:** fill out addresses in `attempt.accept` ([bc69f80](https://github.com/Agoric/agoric-sdk/commit/bc69f80958817204f46bd8adcd31606ca427ebb5))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))


### Bug Fixes

* **SwingSet:** Carry ambient ses-ava types ([2fda391](https://github.com/Agoric/agoric-sdk/commit/2fda391170724d5c3a5673367a969759d7acff06))
* Remove extraneous eslint globals ([17087e4](https://github.com/Agoric/agoric-sdk/commit/17087e4605db7d3b30dfccf2434b2850b45e3408))
* **meter:** use `process.env` not `process.environment` ([c703d07](https://github.com/Agoric/agoric-sdk/commit/c703d07e58ae12d849b417256598aa9015d9e513))
* **store:** use explicit `import('@endo/marshal')` JSDoc ([4795147](https://github.com/Agoric/agoric-sdk/commit/47951473d4679c7e95104f5ae32fe63c8547598e))
* **swingset:** don't kernel panic upon device error ([eb56677](https://github.com/Agoric/agoric-sdk/commit/eb56677533b77ae91a3bcafb329b427dac95c51a)), closes [#4326](https://github.com/Agoric/agoric-sdk/issues/4326)
* **swingset:** use consistent lowercase `bundlecap' in API/docs ([872f956](https://github.com/Agoric/agoric-sdk/commit/872f95619c48bd79186781c893e347f227dcf9af)), closes [#4372](https://github.com/Agoric/agoric-sdk/issues/4372)
* don't swallow errors that happen during delivery into a vat ([e39ce77](https://github.com/Agoric/agoric-sdk/commit/e39ce771e45068be80235121bd30e77397515fba))
* fake VOM bitrot ([c9faf9c](https://github.com/Agoric/agoric-sdk/commit/c9faf9cb890b68f717ddfe060802be5083064443)), closes [#4591](https://github.com/Agoric/agoric-sdk/issues/4591)
* **slogSender:** serialise the JSON to ensure SLOGFILE is pristine ([854a59a](https://github.com/Agoric/agoric-sdk/commit/854a59a09117fb035be828bbad339b70c7909667))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* remove pureCopy deleted from endo 1061 ([#4458](https://github.com/Agoric/agoric-sdk/issues/4458)) ([50e8523](https://github.com/Agoric/agoric-sdk/commit/50e852346d0b4005c613e30d10b469d89a4e5564))
* **SwingSet:** don't do liveSlots logging in consensus mode ([d563783](https://github.com/Agoric/agoric-sdk/commit/d563783cd20da195093f23aa7214f1fd2405f7cc))
* **SwingSet:** Update snapshot hashes ([d5f54c6](https://github.com/Agoric/agoric-sdk/commit/d5f54c64585edf3759afb8c8ad3052815eb334eb))
* **xsnap:** use `object-inspect` to render `print` output better ([3c3a353](https://github.com/Agoric/agoric-sdk/commit/3c3a353bb67b8b623e5b931632d28d96a535f215))



### [0.24.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.24.0...@agoric/swingset-vat@0.24.1) (2021-12-22)


### Features

* add vatstoreGetAfter syscall to enable iterating vatstore keys ([63c7d97](https://github.com/Agoric/agoric-sdk/commit/63c7d9759875574fc8b78b5ca8a5646da0604cc7))
* support vatstore iteration over explicit key bounds ([f220dd8](https://github.com/Agoric/agoric-sdk/commit/f220dd8d89a6ca9ae61093d7613720a4454b62b6))


### Bug Fixes

* **liveSlots:** reflect return value marshalling failures ([fd17b22](https://github.com/Agoric/agoric-sdk/commit/fd17b22874927540f0bad7fb081c9a7e56c901e9))
* changes based on review comments ([e723855](https://github.com/Agoric/agoric-sdk/commit/e7238550829b5ff6bbec015e2a66263118a2716b))
* tweaks based on review comments ([f0e42b1](https://github.com/Agoric/agoric-sdk/commit/f0e42b11046469bf29394c1bdd7ef1fb772f6474))



## [0.24.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.23.0...@agoric/swingset-vat@0.24.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* remove newSwap; replace with constantProduct AMM where needed (#4097)

### Features

* GC virtual object property refs ([9ec8ce7](https://github.com/Agoric/agoric-sdk/commit/9ec8ce73423b783428dd56b8fc3ff1c094a02eed))
* implement Bring Out Your Dead as a kernel-driven operation ([a1310e0](https://github.com/Agoric/agoric-sdk/commit/a1310e0f51348f8d6c7f4d7281f96cbe8e72b134))
* remove newSwap; replace with constantProduct AMM where needed ([#4097](https://github.com/Agoric/agoric-sdk/issues/4097)) ([aaea050](https://github.com/Agoric/agoric-sdk/commit/aaea0503b369e4d0b4d9cbb1e00ee02109470060))
* **SwingSet:** stub out metering for `SWINGSET_WORKER_TYPE=local` ([19ad030](https://github.com/Agoric/agoric-sdk/commit/19ad030253f6cc24d4f6e1fbf1af4bae65f8c2ae))
* replace internal usage of ag-chain-cosmos with agd ([d4e1128](https://github.com/Agoric/agoric-sdk/commit/d4e1128b8542c48b060ed1be9778e5779668d5b5))
* VOM weak key GC ([4e25336](https://github.com/Agoric/agoric-sdk/commit/4e2533607f9705097b7848d41f582538a212d866))


### Bug Fixes

* **deps:** remove explicit `@agoric/babel-standalone` ([4f22453](https://github.com/Agoric/agoric-sdk/commit/4f22453a6f2de1a2c27ae8ad0d11b13116890dab))
* **SwingSet:** load SES before providing ses-ava ([4bccfb0](https://github.com/Agoric/agoric-sdk/commit/4bccfb037882a4a4ab92cbd59a2d4bc3b51e14d4))
* avoid GC non-determinism to be inappropriately visible ([6624425](https://github.com/Agoric/agoric-sdk/commit/6624425b9f93847e276db6b062064b72a4362b81))
* changes from review plus fix stochastically broken tests ([e99b15c](https://github.com/Agoric/agoric-sdk/commit/e99b15c9132a8d864e4a0d31876e79e98c0b06e0))
* correct export retirement handling and GC checks ([f8131e0](https://github.com/Agoric/agoric-sdk/commit/f8131e0d2ca8762c7fe47cbd8c612c07d2e58512))
* re2 is obsolete in favor of XS RegExp metering ([54fdc51](https://github.com/Agoric/agoric-sdk/commit/54fdc5173f3d6a97b4eaed4ce076ff8405594746))
* review updates (mostly renaming things) ([9a47516](https://github.com/Agoric/agoric-sdk/commit/9a47516a349185409d3c320b585312178c8a08b8))
* update newer tests for BOYD ([81c8f8b](https://github.com/Agoric/agoric-sdk/commit/81c8f8b1425cc8bbee1cc36425ca99412ed2e5c9))
* **eventual-send:** provide `returnedP` when it is available ([a779066](https://github.com/Agoric/agoric-sdk/commit/a7790660db426e1967f444c034c3dedd59ed33eb))
* **liveSlots:** explicitly handle (though stub) remote properties ([ca397ba](https://github.com/Agoric/agoric-sdk/commit/ca397ba2481639beba17f654c9ff07cebb5a5213))
* **SwingSet:** `typeof f === 'function'`, not `instanceOf Function` ([ed797d0](https://github.com/Agoric/agoric-sdk/commit/ed797d0bee3cbb4084df7e0961fdbfe741039b79))
* **SwingSet:** plumb through `runtimeOptions.env` ([250ddc0](https://github.com/Agoric/agoric-sdk/commit/250ddc0a0ee23223d1c3c9f6a0bb0b1eb37b8dec))
* route all finalization through the possiblyDeadSet ([a8e1b3b](https://github.com/Agoric/agoric-sdk/commit/a8e1b3b6f4d4573cd5c3862eb39ef8e46e2b767f))



## [0.23.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.22.1...@agoric/swingset-vat@0.23.0) (2021-10-13)


### ⚠ BREAKING CHANGES

* **xsnap:** upgrade XS to fix memory leak

### Features

* Thread URL and Base64 endowments ([b52269d](https://github.com/Agoric/agoric-sdk/commit/b52269d58be665baf45bbb38ace57ca741e5ae4c))


### Bug Fixes

* adapt timers to async iterables ([#3949](https://github.com/Agoric/agoric-sdk/issues/3949)) ([9739127](https://github.com/Agoric/agoric-sdk/commit/9739127262e9fac48757094a4d2d9f3f35f4bfc5))
* **SwingSet:** Adjust SES change detectors ([3efb36e](https://github.com/Agoric/agoric-sdk/commit/3efb36eb48521aeb9479f27bd691be485ecda234))
* **xsnap:** upgrade XS to fix memory leak ([9a70831](https://github.com/Agoric/agoric-sdk/commit/9a70831cbc02edea7721b9a521492c030b097f2c)), closes [#3839](https://github.com/Agoric/agoric-sdk/issues/3839) [#3877](https://github.com/Agoric/agoric-sdk/issues/3877) [#3889](https://github.com/Agoric/agoric-sdk/issues/3889)



### [0.22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.22.0...@agoric/swingset-vat@0.22.1) (2021-09-23)


### Features

* **TimerService:** add new `delay` method and protect device args ([7a2c830](https://github.com/Agoric/agoric-sdk/commit/7a2c830b6cdea1e81cc0eb8fef517704dc30a922))


### Bug Fixes

* **solo:** make `localTimerService` in ms, and update correctly ([d6d4724](https://github.com/Agoric/agoric-sdk/commit/d6d472445a05b8c3d83fc9621879c3c91bf4d737))
* **swingset:** DummySlogger needs to be more realistic ([d8d146d](https://github.com/Agoric/agoric-sdk/commit/d8d146de69a08d2b6582b3a778a7f44985450fc0))
* **swingset:** have slogger record replay status for syscalls too ([722f903](https://github.com/Agoric/agoric-sdk/commit/722f903c8306f4245addad6bbe9df7b8b7a7321b))
* **swingset:** make vat-warehouse responsible for slogging deliveries ([e317589](https://github.com/Agoric/agoric-sdk/commit/e31758914c165113c4ba6a4574a73ee888addad1))
* **SwingSet:** improve slogging during replay ([d6e64da](https://github.com/Agoric/agoric-sdk/commit/d6e64daf4d8240ad51eafb917e6f4590c8caebfb)), closes [#3428](https://github.com/Agoric/agoric-sdk/issues/3428)
* **timer:** remove deprecated `createRepeater` ([b45c66d](https://github.com/Agoric/agoric-sdk/commit/b45c66d6d5aadcd91bd2e50d31104bce8d4d78f6))
* **xsnap:** format objects nicely in console using SES assert.quote ([#3856](https://github.com/Agoric/agoric-sdk/issues/3856)) ([a3306d0](https://github.com/Agoric/agoric-sdk/commit/a3306d01d8e87c4bc7483a61e42cc30b006feb81)), closes [#3844](https://github.com/Agoric/agoric-sdk/issues/3844)



## [0.22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.21.3...@agoric/swingset-vat@0.22.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* clean up organization of swing-store

### Features

* **swingset-vat:** Thread dev dependencies explicitly ([f55982f](https://github.com/Agoric/agoric-sdk/commit/f55982fccf211fba9625cd8015b5c06e9644ee60))
* **swingset-vat:** Thread module format through loadBasedir, swingset config ([b243889](https://github.com/Agoric/agoric-sdk/commit/b243889d2f5e7c3c279373943b593cf9773c6366))
* **xsnap:** integrate native TextEncoder / TextDecoder ([9d65dbe](https://github.com/Agoric/agoric-sdk/commit/9d65dbe2410e1856c3ac1fa6ff7eb921bb24ec0c))


### Bug Fixes

* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))
* XS + SES snapshots are deterministic (test) ([#3781](https://github.com/Agoric/agoric-sdk/issues/3781)) ([95c5f01](https://github.com/Agoric/agoric-sdk/commit/95c5f014b2808ef1b3a32302bb37b3894e449abe)), closes [#2776](https://github.com/Agoric/agoric-sdk/issues/2776)


### Code Refactoring

* clean up organization of swing-store ([3c7e57b](https://github.com/Agoric/agoric-sdk/commit/3c7e57b8f62c0b93660dd57c002ffb96c2cd4137))



### [0.21.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.21.2...@agoric/swingset-vat@0.21.3) (2021-08-18)


### Bug Fixes

* **swingset:** commit crank-buffer after every c.step/c.run ([90c2b85](https://github.com/Agoric/agoric-sdk/commit/90c2b856228b926c40440172bc911568b8c1e0c5)), closes [#720](https://github.com/Agoric/agoric-sdk/issues/720) [#3720](https://github.com/Agoric/agoric-sdk/issues/3720)
* **swingset:** comms initialization check must be deterministic ([683b771](https://github.com/Agoric/agoric-sdk/commit/683b77108dbb6afaf6b2557dfacae2298016eaca)), closes [#2910](https://github.com/Agoric/agoric-sdk/issues/2910) [#3726](https://github.com/Agoric/agoric-sdk/issues/3726)
* **swingset:** make test-controller less sensitive to source changes ([c07ad3a](https://github.com/Agoric/agoric-sdk/commit/c07ad3af053210cc157c0766f201dd787237f79e)), closes [#3718](https://github.com/Agoric/agoric-sdk/issues/3718)
* **swingset:** record cranks and crankhash/activityhash in slog ([8bc08de](https://github.com/Agoric/agoric-sdk/commit/8bc08de37da922803bf880303729b68c098590ae)), closes [#3720](https://github.com/Agoric/agoric-sdk/issues/3720)



### [0.21.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.21.1...@agoric/swingset-vat@0.21.2) (2021-08-17)


### Bug Fixes

* Remove dregs of node -r esm ([#3710](https://github.com/Agoric/agoric-sdk/issues/3710)) ([e30c934](https://github.com/Agoric/agoric-sdk/commit/e30c934a9de19e930677c7b65ad98abe0be16d56))
* Remove superfluous -S for env in shebangs ([0b897ab](https://github.com/Agoric/agoric-sdk/commit/0b897ab04941ce1b690459e3386fd2c02d860f45))



### [0.21.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.21.0...@agoric/swingset-vat@0.21.1) (2021-08-16)


### Bug Fixes

* remove more instances of `.cjs` files ([0f61d9b](https://github.com/Agoric/agoric-sdk/commit/0f61d9bff763aeb21c7b61010040ca5e7bd964eb))



## [0.21.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.6...@agoric/swingset-vat@0.21.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **swingset:** Convert plugin API to NESM
* **swingset:** Convert RESM to NESM

### Features

* **swingset:** add "run policy" object to controller.run() ([420edda](https://github.com/Agoric/agoric-sdk/commit/420edda2f8dd668cf84acc1b7cd0929bcbd79623)), closes [#3460](https://github.com/Agoric/agoric-sdk/issues/3460)
* **swingset:** hash kernel state changes into 'activityhash' ([47ec86b](https://github.com/Agoric/agoric-sdk/commit/47ec86be063f9021c91018dbc1f0952be543f0c7)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* require that buildRootObject always returns a Far reference ([0cda623](https://github.com/Agoric/agoric-sdk/commit/0cda6230210add2bbedc40100dbfe8f0f8e98826))


### Bug Fixes

* **swingset:** define 'meterControl' to disable metering ([bdf8c08](https://github.com/Agoric/agoric-sdk/commit/bdf8c08ec2643217f507968bc9ae36fa548a8f69)), closes [#3458](https://github.com/Agoric/agoric-sdk/issues/3458)
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)
* **swingset:** Finish vat tool RESM to NESM conversion ([b6e943b](https://github.com/Agoric/agoric-sdk/commit/b6e943b6573bd75e408987a55a597198ec2ac00d))
* **swingset:** liveslots: disable metering of GC-sensitive calls ([a11a477](https://github.com/Agoric/agoric-sdk/commit/a11a477d867ab83415db9aff666f6d91f9ed6bd9)), closes [#3458](https://github.com/Agoric/agoric-sdk/issues/3458)
* **swingset:** move "kernelStats" into local/non-hashed DB space ([df8359e](https://github.com/Agoric/agoric-sdk/commit/df8359eca80e28736d294a558ed6c5e3b8b14127)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* **swingset:** rename snapshot-related DB keys to be "local" ([e79e43c](https://github.com/Agoric/agoric-sdk/commit/e79e43c2776161b3f872a130131ad4a7b4c16e3f)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* **swingset:** Support NESM importers ([fac9b1a](https://github.com/Agoric/agoric-sdk/commit/fac9b1a97b30e037982db4c44ccc885b27d87c40))
* **swingset:** test-marshal.js: delete leftover+slow kernel creation ([beb9f59](https://github.com/Agoric/agoric-sdk/commit/beb9f59dd3c54d39663218dd9d96fc9988a16216))
* **swingset:** use better async style, improve comment ([64e4f2f](https://github.com/Agoric/agoric-sdk/commit/64e4f2f2c48b209b68d8a27c23b087f1ecd9a61c))
* newly missing fars ([#3557](https://github.com/Agoric/agoric-sdk/issues/3557)) ([32069cc](https://github.com/Agoric/agoric-sdk/commit/32069cc20e4e408cbc0c1881f36b44a3b9d24730))
* require virtual object selves to be declared Far ([619bbda](https://github.com/Agoric/agoric-sdk/commit/619bbda5223a2fe5168d7cb9851c5ac4dcc7cbac)), closes [#3562](https://github.com/Agoric/agoric-sdk/issues/3562)


### Code Refactoring

* **swingset:** Convert plugin API to NESM ([8ab2b03](https://github.com/Agoric/agoric-sdk/commit/8ab2b03970aa6735ad1f05756048a3dc09a190ce))
* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### ⚠ BREAKING CHANGES

* **swingset:** remove support for non-XS metering
* **swingset:** make dynamic vats unmetered by default

### Features

* first stage GC for virtual objects ([c1fb35c](https://github.com/Agoric/agoric-sdk/commit/c1fb35ce9bbc5299d9bef29e24b14c080c879d8d))
* **swingset:** add Meters to kernel state ([03f148b](https://github.com/Agoric/agoric-sdk/commit/03f148b20de7f0f7d5b56da63c8358dde8d7de16)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** implement Meters for crank computation charges ([7a7d616](https://github.com/Agoric/agoric-sdk/commit/7a7d61670baedf1968fd8086cdb8824bd006bad4)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** make dynamic vats unmetered by default ([c73dd8d](https://github.com/Agoric/agoric-sdk/commit/c73dd8d8ea3b7859313f245537f04dd6f92ba0c6)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** remove support for non-XS metering ([5b95638](https://github.com/Agoric/agoric-sdk/commit/5b9563849fa7ca2f26b4ca7c55f10d1d37334f46)), closes [#3518](https://github.com/Agoric/agoric-sdk/issues/3518)
* **SwingSet:** new `overrideVatManagerOptions` kernel option ([1ec045b](https://github.com/Agoric/agoric-sdk/commit/1ec045bad58ee7b5e9fccf36782793a3dd780337))
* **SwingSet:** plumb consensusMode for stricter determinism ([16ec7ca](https://github.com/Agoric/agoric-sdk/commit/16ec7ca688465aa0ee3fb9ed08be5be910c2554f))
* **SwingSet:** support more managers with consensusMode ([ea3280e](https://github.com/Agoric/agoric-sdk/commit/ea3280e061818f99681f2d9600ba140a1606671d))
* audit object refcounts ([d7c9792](https://github.com/Agoric/agoric-sdk/commit/d7c9792597d063fbc8970acb034674b15865de7d)), closes [#3445](https://github.com/Agoric/agoric-sdk/issues/3445)
* refactor object pinning ([9941a08](https://github.com/Agoric/agoric-sdk/commit/9941a086837ad4e6c314da5a6c4faa999430c3f4))
* utility to replace kernel bundle in kernel DB ([07b300e](https://github.com/Agoric/agoric-sdk/commit/07b300e2b7656e12ac4b011d0ebae73c9d8fa50c))


### Bug Fixes

* **swingset:** make test less sensitive to changes in metering ([e741be3](https://github.com/Agoric/agoric-sdk/commit/e741be3fbef8c746be476b13f9eb0d6e3e326dae)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3538](https://github.com/Agoric/agoric-sdk/issues/3538)
* various tweaks and cleanup in response to review comments ([fe777e4](https://github.com/Agoric/agoric-sdk/commit/fe777e4dde970fdfeb0189e2fbf12db68c160046))
* **swingset:** addEgress should cause an import/reachable refcount ([230b494](https://github.com/Agoric/agoric-sdk/commit/230b4948d112cf57393c91bb1bc53714efa37e58)), closes [#3483](https://github.com/Agoric/agoric-sdk/issues/3483)
* **swingset:** don't deduplicate inbound mailbox messages ([2018d76](https://github.com/Agoric/agoric-sdk/commit/2018d76bdbf8b16f72e9ec8a4af7786e8b4fb8cd)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442) [#3471](https://github.com/Agoric/agoric-sdk/issues/3471)
* **swingset:** don't pin the interior queueMessage promise ([4379f41](https://github.com/Agoric/agoric-sdk/commit/4379f41acf6a750f2edabf0e1bfb388cb53156c6)), closes [#3482](https://github.com/Agoric/agoric-sdk/issues/3482)
* **swingset:** gcAndFinalize needs two post-GC setImmediates on V8 ([#3486](https://github.com/Agoric/agoric-sdk/issues/3486)) ([cc9428f](https://github.com/Agoric/agoric-sdk/commit/cc9428f3c5b7d8d991f55904a958d339d3ff88d7)), closes [#3482](https://github.com/Agoric/agoric-sdk/issues/3482) [#3240](https://github.com/Agoric/agoric-sdk/issues/3240)
* **swingset:** processRefcounts() even if crank was aborted ([3320412](https://github.com/Agoric/agoric-sdk/commit/3320412be8db63df39a2ba60e1e30928d0741f16))
* **swingset:** test simultaneous underflow+notify, simplify kernel ([077dcec](https://github.com/Agoric/agoric-sdk/commit/077dcec47f2b999326846c561953b911f42c93f8)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** test/vat-controller-one: disregard non-message deliveries ([706be79](https://github.com/Agoric/agoric-sdk/commit/706be79bb611d82742c49ae0912045e891cbc773))
* better db location logic ([a76d3b7](https://github.com/Agoric/agoric-sdk/commit/a76d3b73e47052bacfd6b5137812356cf6953424))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))
* **SwingSet:** simplify makeVatConsole to always use a wrapper ([dc0839b](https://github.com/Agoric/agoric-sdk/commit/dc0839b44d489bccb3bdb9ab666c410863b15647))
* make verbose flag work from the very beginning ([7edfa24](https://github.com/Agoric/agoric-sdk/commit/7edfa24ca7ca8f511775791cef690bf482a7bc81))



## [0.20.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.6...@agoric/swingset-vat@0.20.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **swingset:** Convert plugin API to NESM
* **swingset:** Convert RESM to NESM

### Features

* **swingset:** add "run policy" object to controller.run() ([420edda](https://github.com/Agoric/agoric-sdk/commit/420edda2f8dd668cf84acc1b7cd0929bcbd79623)), closes [#3460](https://github.com/Agoric/agoric-sdk/issues/3460)
* **swingset:** hash kernel state changes into 'activityhash' ([47ec86b](https://github.com/Agoric/agoric-sdk/commit/47ec86be063f9021c91018dbc1f0952be543f0c7)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* require that buildRootObject always returns a Far reference ([0cda623](https://github.com/Agoric/agoric-sdk/commit/0cda6230210add2bbedc40100dbfe8f0f8e98826))


### Bug Fixes

* **swingset:** define 'meterControl' to disable metering ([bdf8c08](https://github.com/Agoric/agoric-sdk/commit/bdf8c08ec2643217f507968bc9ae36fa548a8f69)), closes [#3458](https://github.com/Agoric/agoric-sdk/issues/3458)
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)
* **swingset:** Finish vat tool RESM to NESM conversion ([b6e943b](https://github.com/Agoric/agoric-sdk/commit/b6e943b6573bd75e408987a55a597198ec2ac00d))
* **swingset:** liveslots: disable metering of GC-sensitive calls ([a11a477](https://github.com/Agoric/agoric-sdk/commit/a11a477d867ab83415db9aff666f6d91f9ed6bd9)), closes [#3458](https://github.com/Agoric/agoric-sdk/issues/3458)
* **swingset:** move "kernelStats" into local/non-hashed DB space ([df8359e](https://github.com/Agoric/agoric-sdk/commit/df8359eca80e28736d294a558ed6c5e3b8b14127)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* **swingset:** rename snapshot-related DB keys to be "local" ([e79e43c](https://github.com/Agoric/agoric-sdk/commit/e79e43c2776161b3f872a130131ad4a7b4c16e3f)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* **swingset:** Support NESM importers ([fac9b1a](https://github.com/Agoric/agoric-sdk/commit/fac9b1a97b30e037982db4c44ccc885b27d87c40))
* **swingset:** test-marshal.js: delete leftover+slow kernel creation ([beb9f59](https://github.com/Agoric/agoric-sdk/commit/beb9f59dd3c54d39663218dd9d96fc9988a16216))
* **swingset:** use better async style, improve comment ([64e4f2f](https://github.com/Agoric/agoric-sdk/commit/64e4f2f2c48b209b68d8a27c23b087f1ecd9a61c))
* newly missing fars ([#3557](https://github.com/Agoric/agoric-sdk/issues/3557)) ([32069cc](https://github.com/Agoric/agoric-sdk/commit/32069cc20e4e408cbc0c1881f36b44a3b9d24730))
* require virtual object selves to be declared Far ([619bbda](https://github.com/Agoric/agoric-sdk/commit/619bbda5223a2fe5168d7cb9851c5ac4dcc7cbac)), closes [#3562](https://github.com/Agoric/agoric-sdk/issues/3562)


### Code Refactoring

* **swingset:** Convert plugin API to NESM ([8ab2b03](https://github.com/Agoric/agoric-sdk/commit/8ab2b03970aa6735ad1f05756048a3dc09a190ce))
* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### ⚠ BREAKING CHANGES

* **swingset:** remove support for non-XS metering
* **swingset:** make dynamic vats unmetered by default

### Features

* first stage GC for virtual objects ([c1fb35c](https://github.com/Agoric/agoric-sdk/commit/c1fb35ce9bbc5299d9bef29e24b14c080c879d8d))
* **swingset:** add Meters to kernel state ([03f148b](https://github.com/Agoric/agoric-sdk/commit/03f148b20de7f0f7d5b56da63c8358dde8d7de16)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** implement Meters for crank computation charges ([7a7d616](https://github.com/Agoric/agoric-sdk/commit/7a7d61670baedf1968fd8086cdb8824bd006bad4)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** make dynamic vats unmetered by default ([c73dd8d](https://github.com/Agoric/agoric-sdk/commit/c73dd8d8ea3b7859313f245537f04dd6f92ba0c6)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** remove support for non-XS metering ([5b95638](https://github.com/Agoric/agoric-sdk/commit/5b9563849fa7ca2f26b4ca7c55f10d1d37334f46)), closes [#3518](https://github.com/Agoric/agoric-sdk/issues/3518)
* **SwingSet:** new `overrideVatManagerOptions` kernel option ([1ec045b](https://github.com/Agoric/agoric-sdk/commit/1ec045bad58ee7b5e9fccf36782793a3dd780337))
* **SwingSet:** plumb consensusMode for stricter determinism ([16ec7ca](https://github.com/Agoric/agoric-sdk/commit/16ec7ca688465aa0ee3fb9ed08be5be910c2554f))
* **SwingSet:** support more managers with consensusMode ([ea3280e](https://github.com/Agoric/agoric-sdk/commit/ea3280e061818f99681f2d9600ba140a1606671d))
* audit object refcounts ([d7c9792](https://github.com/Agoric/agoric-sdk/commit/d7c9792597d063fbc8970acb034674b15865de7d)), closes [#3445](https://github.com/Agoric/agoric-sdk/issues/3445)
* refactor object pinning ([9941a08](https://github.com/Agoric/agoric-sdk/commit/9941a086837ad4e6c314da5a6c4faa999430c3f4))
* utility to replace kernel bundle in kernel DB ([07b300e](https://github.com/Agoric/agoric-sdk/commit/07b300e2b7656e12ac4b011d0ebae73c9d8fa50c))


### Bug Fixes

* **swingset:** make test less sensitive to changes in metering ([e741be3](https://github.com/Agoric/agoric-sdk/commit/e741be3fbef8c746be476b13f9eb0d6e3e326dae)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3538](https://github.com/Agoric/agoric-sdk/issues/3538)
* various tweaks and cleanup in response to review comments ([fe777e4](https://github.com/Agoric/agoric-sdk/commit/fe777e4dde970fdfeb0189e2fbf12db68c160046))
* **swingset:** addEgress should cause an import/reachable refcount ([230b494](https://github.com/Agoric/agoric-sdk/commit/230b4948d112cf57393c91bb1bc53714efa37e58)), closes [#3483](https://github.com/Agoric/agoric-sdk/issues/3483)
* **swingset:** don't deduplicate inbound mailbox messages ([2018d76](https://github.com/Agoric/agoric-sdk/commit/2018d76bdbf8b16f72e9ec8a4af7786e8b4fb8cd)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442) [#3471](https://github.com/Agoric/agoric-sdk/issues/3471)
* **swingset:** don't pin the interior queueMessage promise ([4379f41](https://github.com/Agoric/agoric-sdk/commit/4379f41acf6a750f2edabf0e1bfb388cb53156c6)), closes [#3482](https://github.com/Agoric/agoric-sdk/issues/3482)
* **swingset:** gcAndFinalize needs two post-GC setImmediates on V8 ([#3486](https://github.com/Agoric/agoric-sdk/issues/3486)) ([cc9428f](https://github.com/Agoric/agoric-sdk/commit/cc9428f3c5b7d8d991f55904a958d339d3ff88d7)), closes [#3482](https://github.com/Agoric/agoric-sdk/issues/3482) [#3240](https://github.com/Agoric/agoric-sdk/issues/3240)
* **swingset:** processRefcounts() even if crank was aborted ([3320412](https://github.com/Agoric/agoric-sdk/commit/3320412be8db63df39a2ba60e1e30928d0741f16))
* **swingset:** test simultaneous underflow+notify, simplify kernel ([077dcec](https://github.com/Agoric/agoric-sdk/commit/077dcec47f2b999326846c561953b911f42c93f8)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** test/vat-controller-one: disregard non-message deliveries ([706be79](https://github.com/Agoric/agoric-sdk/commit/706be79bb611d82742c49ae0912045e891cbc773))
* better db location logic ([a76d3b7](https://github.com/Agoric/agoric-sdk/commit/a76d3b73e47052bacfd6b5137812356cf6953424))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))
* **SwingSet:** simplify makeVatConsole to always use a wrapper ([dc0839b](https://github.com/Agoric/agoric-sdk/commit/dc0839b44d489bccb3bdb9ab666c410863b15647))
* make verbose flag work from the very beginning ([7edfa24](https://github.com/Agoric/agoric-sdk/commit/7edfa24ca7ca8f511775791cef690bf482a7bc81))



## [0.19.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.6...@agoric/swingset-vat@0.19.0) (2021-07-28)


### ⚠ BREAKING CHANGES

* **swingset:** remove support for non-XS metering
* **swingset:** make dynamic vats unmetered by default

### Features

* first stage GC for virtual objects ([c1fb35c](https://github.com/Agoric/agoric-sdk/commit/c1fb35ce9bbc5299d9bef29e24b14c080c879d8d))
* **swingset:** add Meters to kernel state ([03f148b](https://github.com/Agoric/agoric-sdk/commit/03f148b20de7f0f7d5b56da63c8358dde8d7de16)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** implement Meters for crank computation charges ([7a7d616](https://github.com/Agoric/agoric-sdk/commit/7a7d61670baedf1968fd8086cdb8824bd006bad4)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** make dynamic vats unmetered by default ([c73dd8d](https://github.com/Agoric/agoric-sdk/commit/c73dd8d8ea3b7859313f245537f04dd6f92ba0c6)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** remove support for non-XS metering ([5b95638](https://github.com/Agoric/agoric-sdk/commit/5b9563849fa7ca2f26b4ca7c55f10d1d37334f46)), closes [#3518](https://github.com/Agoric/agoric-sdk/issues/3518)
* **SwingSet:** new `overrideVatManagerOptions` kernel option ([1ec045b](https://github.com/Agoric/agoric-sdk/commit/1ec045bad58ee7b5e9fccf36782793a3dd780337))
* **SwingSet:** plumb consensusMode for stricter determinism ([16ec7ca](https://github.com/Agoric/agoric-sdk/commit/16ec7ca688465aa0ee3fb9ed08be5be910c2554f))
* **SwingSet:** support more managers with consensusMode ([ea3280e](https://github.com/Agoric/agoric-sdk/commit/ea3280e061818f99681f2d9600ba140a1606671d))
* audit object refcounts ([d7c9792](https://github.com/Agoric/agoric-sdk/commit/d7c9792597d063fbc8970acb034674b15865de7d)), closes [#3445](https://github.com/Agoric/agoric-sdk/issues/3445)
* refactor object pinning ([9941a08](https://github.com/Agoric/agoric-sdk/commit/9941a086837ad4e6c314da5a6c4faa999430c3f4))
* utility to replace kernel bundle in kernel DB ([07b300e](https://github.com/Agoric/agoric-sdk/commit/07b300e2b7656e12ac4b011d0ebae73c9d8fa50c))


### Bug Fixes

* **swingset:** make test less sensitive to changes in metering ([e741be3](https://github.com/Agoric/agoric-sdk/commit/e741be3fbef8c746be476b13f9eb0d6e3e326dae)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308) [#3538](https://github.com/Agoric/agoric-sdk/issues/3538)
* various tweaks and cleanup in response to review comments ([fe777e4](https://github.com/Agoric/agoric-sdk/commit/fe777e4dde970fdfeb0189e2fbf12db68c160046))
* **swingset:** addEgress should cause an import/reachable refcount ([230b494](https://github.com/Agoric/agoric-sdk/commit/230b4948d112cf57393c91bb1bc53714efa37e58)), closes [#3483](https://github.com/Agoric/agoric-sdk/issues/3483)
* **swingset:** don't deduplicate inbound mailbox messages ([2018d76](https://github.com/Agoric/agoric-sdk/commit/2018d76bdbf8b16f72e9ec8a4af7786e8b4fb8cd)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442) [#3471](https://github.com/Agoric/agoric-sdk/issues/3471)
* **swingset:** don't pin the interior queueMessage promise ([4379f41](https://github.com/Agoric/agoric-sdk/commit/4379f41acf6a750f2edabf0e1bfb388cb53156c6)), closes [#3482](https://github.com/Agoric/agoric-sdk/issues/3482)
* **swingset:** gcAndFinalize needs two post-GC setImmediates on V8 ([#3486](https://github.com/Agoric/agoric-sdk/issues/3486)) ([cc9428f](https://github.com/Agoric/agoric-sdk/commit/cc9428f3c5b7d8d991f55904a958d339d3ff88d7)), closes [#3482](https://github.com/Agoric/agoric-sdk/issues/3482) [#3240](https://github.com/Agoric/agoric-sdk/issues/3240)
* **swingset:** processRefcounts() even if crank was aborted ([3320412](https://github.com/Agoric/agoric-sdk/commit/3320412be8db63df39a2ba60e1e30928d0741f16))
* **swingset:** test simultaneous underflow+notify, simplify kernel ([077dcec](https://github.com/Agoric/agoric-sdk/commit/077dcec47f2b999326846c561953b911f42c93f8)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **swingset:** test/vat-controller-one: disregard non-message deliveries ([706be79](https://github.com/Agoric/agoric-sdk/commit/706be79bb611d82742c49ae0912045e891cbc773))
* better db location logic ([a76d3b7](https://github.com/Agoric/agoric-sdk/commit/a76d3b73e47052bacfd6b5137812356cf6953424))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))
* **SwingSet:** simplify makeVatConsole to always use a wrapper ([dc0839b](https://github.com/Agoric/agoric-sdk/commit/dc0839b44d489bccb3bdb9ab666c410863b15647))
* make verbose flag work from the very beginning ([7edfa24](https://github.com/Agoric/agoric-sdk/commit/7edfa24ca7ca8f511775791cef690bf482a7bc81))



### [0.18.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.5...@agoric/swingset-vat@0.18.6) (2021-07-01)


### Features

* issue 3161, track recognizable objects used by VOM so other objects can be GC'd ([85303c5](https://github.com/Agoric/agoric-sdk/commit/85303c5290e3606132aca00b1fc5afa748ea89a3))


### Bug Fixes

* **swingset:** don't perturb XS heap state when loading snapshot ([52171a1](https://github.com/Agoric/agoric-sdk/commit/52171a12af41b326b07024735aad5b18e883a9b5))
* make 'bootstrap export' test less sensitive to cross-engine GC variation ([9be7dfc](https://github.com/Agoric/agoric-sdk/commit/9be7dfcf137a8457c3e577e15b94ee01400825ca))



### [0.18.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.4...@agoric/swingset-vat@0.18.5) (2021-06-28)


### Features

* demand-paged vats are reloaded from heap snapshots ([#2848](https://github.com/Agoric/agoric-sdk/issues/2848)) ([cb239cb](https://github.com/Agoric/agoric-sdk/commit/cb239cbb27943ad58c304d85ee9b61ba917af79c)), closes [#2273](https://github.com/Agoric/agoric-sdk/issues/2273) [#2277](https://github.com/Agoric/agoric-sdk/issues/2277) [#2422](https://github.com/Agoric/agoric-sdk/issues/2422)



### [0.18.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.3...@agoric/swingset-vat@0.18.4) (2021-06-25)


### Features

* **swingset:** introduce 'xs-worker-no-gc' for forward compat ([e46cd88](https://github.com/Agoric/agoric-sdk/commit/e46cd883449c02559e2c0c49b66e26695b4b99da))



### [0.18.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.2...@agoric/swingset-vat@0.18.3) (2021-06-24)


### Bug Fixes

* maybe the best of both worlds: xs-worker but no explicit gc() ([8d38e9a](https://github.com/Agoric/agoric-sdk/commit/8d38e9a3d50987cd21e642e330d482e6e733cd3c))



### [0.18.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.1...@agoric/swingset-vat@0.18.2) (2021-06-24)

**Note:** Version bump only for package @agoric/swingset-vat





### [0.18.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.18.0...@agoric/swingset-vat@0.18.1) (2021-06-23)


### Features

* **swingset:** comms state: add object refcounts ([98a2038](https://github.com/Agoric/agoric-sdk/commit/98a20383eb48c5481cf8d005855cce4c6e31a25b))
* **swingset:** comms: add importer tracking ([72f29fa](https://github.com/Agoric/agoric-sdk/commit/72f29fabdc8945b813916787ce93a6083db54f04)), closes [#3223](https://github.com/Agoric/agoric-sdk/issues/3223)
* **swingset:** comms: add/manipulate isReachable flag ([133bbae](https://github.com/Agoric/agoric-sdk/commit/133bbae35ac08f3883380682944ffd606ba638bf))
* **swingset:** comms: enable object tracking in processMaybeFree() ([160026d](https://github.com/Agoric/agoric-sdk/commit/160026d079d3cf94b6423f20033eff1c2a655a55))
* **swingset:** comms: track lastSent seqnum for each object ([03cdce8](https://github.com/Agoric/agoric-sdk/commit/03cdce83d415d9f9c981a669a2500808ff6a23e0))
* **swingset:** implement comms GC, wire everything into place ([c901eb6](https://github.com/Agoric/agoric-sdk/commit/c901eb6eb41f49b7978352aee9ddad23ad8420d5)), closes [#3306](https://github.com/Agoric/agoric-sdk/issues/3306)
* **swingset:** record xs-workers to $XSNAP_TEST_RECORD if set ([#3392](https://github.com/Agoric/agoric-sdk/issues/3392)) ([bacec84](https://github.com/Agoric/agoric-sdk/commit/bacec84f238372543c918ca9032de065a537d44c))


### Bug Fixes

* **swingset:** comms: deleteKernelMapping might free the object ([a3bf097](https://github.com/Agoric/agoric-sdk/commit/a3bf0977abcea7dbef0c89b6c96887ac3f305dbe))
* **swingset:** comms: deleteRemoteMapping might free the object ([e97a21d](https://github.com/Agoric/agoric-sdk/commit/e97a21dca0c6374783331d5d59a9d3047ba7e778))
* **swingset:** comms: remove deleteToRemoteMapping ([6d15240](https://github.com/Agoric/agoric-sdk/commit/6d152401e90804e664a812d7d8d651a7f812be30)), closes [#3306](https://github.com/Agoric/agoric-sdk/issues/3306)
* **swingset:** comms: single-argument delete-mapping functions ([7a79d14](https://github.com/Agoric/agoric-sdk/commit/7a79d146bc0ea9d245f2b0fc9befa4d5305929ff))
* **swingset:** fix GC handling of orphaned objects ([dcfe169](https://github.com/Agoric/agoric-sdk/commit/dcfe16929e8b352fe1318f34b8d1f0367e52fbb1)), closes [#3376](https://github.com/Agoric/agoric-sdk/issues/3376) [#3377](https://github.com/Agoric/agoric-sdk/issues/3377) [#3378](https://github.com/Agoric/agoric-sdk/issues/3378) [#3376](https://github.com/Agoric/agoric-sdk/issues/3376) [#3377](https://github.com/Agoric/agoric-sdk/issues/3377) [#3378](https://github.com/Agoric/agoric-sdk/issues/3378)
* **swingset:** only mark refs for processing if refcount hits zero ([3354bbf](https://github.com/Agoric/agoric-sdk/commit/3354bbf6e100dcd96a0813b15a8bae0dfffa80d3)), closes [#3106](https://github.com/Agoric/agoric-sdk/issues/3106)
* **swingset:** test-comms.js: fix retireImports test ([ba1f244](https://github.com/Agoric/agoric-sdk/commit/ba1f244a6bd58e6d70013a730edec4c6e2b2b367))
* **swingset:** xs-worker confused meter exhaustion with process fail ([#3396](https://github.com/Agoric/agoric-sdk/issues/3396)) ([54ccc21](https://github.com/Agoric/agoric-sdk/commit/54ccc21d77b2324125626c0c928287d584d04244))
* **SwingSet:** Lint fix for vat controller test fixture ([33298d8](https://github.com/Agoric/agoric-sdk/commit/33298d8b4c984eeadfa5d0e415a6cdc6a0d77382))
* **SwingSet:** protect against null kpid when resolving errors ([8f38d01](https://github.com/Agoric/agoric-sdk/commit/8f38d01eae8ba9b9c849e66cc1c16efa4416a7bb))
* **SwingSet:** Use extension for vat-controller jig ([c301496](https://github.com/Agoric/agoric-sdk/commit/c301496b53d27aa5541c425561006bce750d9592))



## [0.18.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.17.3...@agoric/swingset-vat@0.18.0) (2021-06-16)


### ⚠ BREAKING CHANGES

* **swingset:** remove stats from vatAdmin API

### Bug Fixes

* **liveslots:** better error message when buildRootObject is not Far ([34568a9](https://github.com/Agoric/agoric-sdk/commit/34568a922c704681ec7afc8803bb7ffdb14c2999))
* **swingset:** add kernel processing of GC actions before each crank ([462e9fd](https://github.com/Agoric/agoric-sdk/commit/462e9fd36bd5a74dce45ca5a592393b855488e00))
* **swingset:** fix two tests which failed under XS GC ([1ba9224](https://github.com/Agoric/agoric-sdk/commit/1ba9224bc3d6dd67cd1e306f2f284fa10222b4da)), closes [#3240](https://github.com/Agoric/agoric-sdk/issues/3240)
* **swingset:** remove stats from vatAdmin API ([03e7062](https://github.com/Agoric/agoric-sdk/commit/03e7062195684ecf602910198467549a46ef6d52)), closes [#3331](https://github.com/Agoric/agoric-sdk/issues/3331)
* **swingset:** retain more references ([5ace0aa](https://github.com/Agoric/agoric-sdk/commit/5ace0aa302e3b89561f0efc43c48a11cf7ced14b))
* **swingset:** rewrite kernelKeeper.cleanupAfterTerminatedVat ([43a4ff8](https://github.com/Agoric/agoric-sdk/commit/43a4ff853e0182fac41bd3fb0026c6dd9a1a50e3))



### [0.17.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.17.2...@agoric/swingset-vat@0.17.3) (2021-06-15)


### Features

* make vatstore optionally available to vats as a vat power ([229da78](https://github.com/Agoric/agoric-sdk/commit/229da78b42eec89e55803ba3f3f870f86e351286))
* **swingset:** vatKeeper.getOptions() avoids loading source ([4ea2be9](https://github.com/Agoric/agoric-sdk/commit/4ea2be98016593f94e716f4ef1385af60206b9ac)), closes [#3280](https://github.com/Agoric/agoric-sdk/issues/3280)
* don't load unendowed devices ([d6c1de6](https://github.com/Agoric/agoric-sdk/commit/d6c1de636d49c1379e25b27e369ada9e68cfb237))
* modify all SwingStore uses to reflect constructor renaming ([9cda6a4](https://github.com/Agoric/agoric-sdk/commit/9cda6a4542bb64d72ddd42d08e2056f5323b18a9))
* move transcripts out of key-value store and into stream stores ([a128e93](https://github.com/Agoric/agoric-sdk/commit/a128e93803344d8a36140d53d3e7711bec5c2511))
* propery handle remotables vs presences in weak collections ([e4a32a2](https://github.com/Agoric/agoric-sdk/commit/e4a32a21a22be69475439ca719d80143cbdb1d9a))
* support vats without transcripts, notably the comms vat (to start with) ([18d6050](https://github.com/Agoric/agoric-sdk/commit/18d6050150dae08f03319ca2ffae0fd985e92164)), closes [#3217](https://github.com/Agoric/agoric-sdk/issues/3217)
* tools for fiddling with kernel DB ([d14fa1e](https://github.com/Agoric/agoric-sdk/commit/d14fa1e85eb4e5be2c8eec4ac0af7f0cffbdc3c7))
* use 'engine-gc.js' to get the Node.js garbage collector ([0153529](https://github.com/Agoric/agoric-sdk/commit/0153529cbfc0b7da2d1ec434b32b2171bc246f93))
* use WeakRefs to ensure virtual objects have at most one representative apiece ([031c8d0](https://github.com/Agoric/agoric-sdk/commit/031c8d08e3dddb6de050070800903231e8839787))
* vat warehouse for LRU demand paged vats ([#2784](https://github.com/Agoric/agoric-sdk/issues/2784)) ([05f3038](https://github.com/Agoric/agoric-sdk/commit/05f3038c36399e0f47005299479846f2a9a9c649))
* **swingset:** drop Presences, activate `syscall.dropImports` ([84e383a](https://github.com/Agoric/agoric-sdk/commit/84e383a409846f2b6d38c2d443fd390d65da5d30)), closes [#3161](https://github.com/Agoric/agoric-sdk/issues/3161) [#3147](https://github.com/Agoric/agoric-sdk/issues/3147) [#2615](https://github.com/Agoric/agoric-sdk/issues/2615) [#2660](https://github.com/Agoric/agoric-sdk/issues/2660)
* **swingset:** expose writeSlogObject to host application ([851fa61](https://github.com/Agoric/agoric-sdk/commit/851fa6194549973607b75ae949f3d0d990fb2bb2))
* **SwingSet:** add "reachable" flag to clist entries ([4b843a8](https://github.com/Agoric/agoric-sdk/commit/4b843a87f82d9a9045491ef943429e2043b747b2)), closes [#3108](https://github.com/Agoric/agoric-sdk/issues/3108)
* **SwingSet:** change virtualObjectManager API to reduce authority ([65d2e17](https://github.com/Agoric/agoric-sdk/commit/65d2e17becbe15aa6d60c75993209111e10c6af4))
* **SwingSet:** makeFakeVirtualObjectManager() takes options bag ([40bbdee](https://github.com/Agoric/agoric-sdk/commit/40bbdee873d73437e9f19c46688db785b8300bff))
* wrap WeakMap and WeakSet to hide virtual object non-determinism ([bd421ff](https://github.com/Agoric/agoric-sdk/commit/bd421ff1aac2c7dfcc2fd1d035acbc778ab9c4ad))


### Bug Fixes

* **swingset:** activate `dispatch.dropExports` ([0625f14](https://github.com/Agoric/agoric-sdk/commit/0625f14ebc1c4fabf5bd4d6e7b1855a29c1466b8)), closes [#3137](https://github.com/Agoric/agoric-sdk/issues/3137)
* **swingset:** add 'slogFile' option to buildVatController() ([127e18e](https://github.com/Agoric/agoric-sdk/commit/127e18ecfd1616088f1e1fd9370e79bccd0704a3))
* **swingset:** fix refcounts for messages queued to a promise ([0da6eea](https://github.com/Agoric/agoric-sdk/commit/0da6eea9f3b25971b9cbca5352bd2f1ebd8f30f1)), closes [#3264](https://github.com/Agoric/agoric-sdk/issues/3264) [#3264](https://github.com/Agoric/agoric-sdk/issues/3264)
* **swingset:** gc-actions: new algorithm, update test ([6c85e21](https://github.com/Agoric/agoric-sdk/commit/6c85e21831f0c3f867686d4b5f5f66a25f1acdeb))
* **swingset:** hold strong reference to all device nodes ([2a07d8e](https://github.com/Agoric/agoric-sdk/commit/2a07d8e03a96bb6d370040b39f54e338484efe75))
* **swingset:** implement dispatch.retireExports for Remotables ([e8b0f3a](https://github.com/Agoric/agoric-sdk/commit/e8b0f3a01a2ece7c58cf653e8956754d3ebbb9e0))
* **swingset:** remove liveslots "safety pins" ([549c301](https://github.com/Agoric/agoric-sdk/commit/549c3019c3513cfeb35211bc42178cd0102c6543)), closes [#3106](https://github.com/Agoric/agoric-sdk/issues/3106)
* **swingset:** tolerate policy='none' in queueToVatExport ([433efe2](https://github.com/Agoric/agoric-sdk/commit/433efe2689ee9035079a92fb5e1cb8b0deff4ce9))
* **swingset:** use provideVatSlogger inside the slogger ([7848b16](https://github.com/Agoric/agoric-sdk/commit/7848b16de6a754ed80c52afd55e6bf12f054d2b2))
* be more explicit when gc() is not enabled, but not repetitive ([b3f7757](https://github.com/Agoric/agoric-sdk/commit/b3f775704a2a9373623d3c6f24726e14ec8d0056))
* bug [#3022](https://github.com/Agoric/agoric-sdk/issues/3022), off-by-one in slog deliveryNum ([620dcb5](https://github.com/Agoric/agoric-sdk/commit/620dcb5b9dd3dc2c9286aa50d4e03487ca341308))
* detect extra syscalls in replay ([6b6f837](https://github.com/Agoric/agoric-sdk/commit/6b6f837b54b97885b725d408de480222232fec45))
* don't drag in the entire metering transform to kernel ([4db01ca](https://github.com/Agoric/agoric-sdk/commit/4db01ca9b31364accc8393e56f78b136b1461b2f))
* don't go to the head of the LRU unless touching the data ([cbabcc9](https://github.com/Agoric/agoric-sdk/commit/cbabcc9588dbe0f35c0ca10e9a4ca44e93788870))
* ensure replacements of globals can't be bypassed ([3d2a230](https://github.com/Agoric/agoric-sdk/commit/3d2a230822eed17e87a62ebe9df2609d9dcaa372))
* excise @babel/core except from ui-components ([af564f1](https://github.com/Agoric/agoric-sdk/commit/af564f1705bbd8fc53c027e70140a02641b23fa0))
* incorporate changes from review feedback ([dcca675](https://github.com/Agoric/agoric-sdk/commit/dcca6750df50f6db4daff4f794968450a43d1b0e))
* inner self needs to point to representative to survive GC while in LRU ([26f9a41](https://github.com/Agoric/agoric-sdk/commit/26f9a416e2f059b0589917d88193739b946ee7a3))
* make loopbox device compatible with replay ([ce11fff](https://github.com/Agoric/agoric-sdk/commit/ce11fff37da1d1856d4bb6458b08d7ae73267175)), closes [#3260](https://github.com/Agoric/agoric-sdk/issues/3260)
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))
* Sync versions locally ([90b07d8](https://github.com/Agoric/agoric-sdk/commit/90b07d8faef4d30ae07e909548ce2798db7dd816))
* **swingset:** add gcAndFinalize, tests ([d4bc617](https://github.com/Agoric/agoric-sdk/commit/d4bc61724365ae7eefb64459c7aefb5f2189e4b1)), closes [#2660](https://github.com/Agoric/agoric-sdk/issues/2660)
* **swingset:** do not record GC syscalls in the transcript ([d18ddf5](https://github.com/Agoric/agoric-sdk/commit/d18ddf56815c61737388c76324e98ad7a001ffb2)), closes [#3146](https://github.com/Agoric/agoric-sdk/issues/3146) [#2615](https://github.com/Agoric/agoric-sdk/issues/2615) [#2660](https://github.com/Agoric/agoric-sdk/issues/2660) [#2724](https://github.com/Agoric/agoric-sdk/issues/2724)
* **swingset:** factor out replayOneDelivery from manager helper ([e45f5ad](https://github.com/Agoric/agoric-sdk/commit/e45f5ad1772915f239d9f888a72468ba37136396))
* **swingset:** include vatParameters in slogfile create-vat records ([8216cde](https://github.com/Agoric/agoric-sdk/commit/8216cde7e5668341c971070dfe5157221a0c398f))
* **swingset:** track exported Remotables during export, not serialization ([0bc31e9](https://github.com/Agoric/agoric-sdk/commit/0bc31e9928ac836df675f7b8a48f344b6cbb4bb2))
* **swingset:** track pendingPromises ([fe93b3d](https://github.com/Agoric/agoric-sdk/commit/fe93b3dba3b023e0d8255584add3aabaf11dfea1))
* **SwingSet:** enable getKeys('','') in blockBuffer/crankBuffer ([ff6af69](https://github.com/Agoric/agoric-sdk/commit/ff6af6926cb9bac29873f84a85ad409e0ef0f588))
* **SwingSet:** let vatManager creator override syscall comparison ([94f3740](https://github.com/Agoric/agoric-sdk/commit/94f37408db7cb93917cb1e8495f203ee2871f909))
* **SwingSet:** makeFakeVirtualObjectManager takes weak=true ([e3ab2e1](https://github.com/Agoric/agoric-sdk/commit/e3ab2e191f77cd24e5752c574cd79effd46c5f99))
* **SwingSet:** VOM retains Remotables used in virtualized data ([e4ed4c0](https://github.com/Agoric/agoric-sdk/commit/e4ed4c0a7ec5da715c88c06d0a69b167f3f4dedc)), closes [#3132](https://github.com/Agoric/agoric-sdk/issues/3132) [#3106](https://github.com/Agoric/agoric-sdk/issues/3106)
* **SwingSet:** VOM tracks Presence vrefs in virtualized data ([71c85ec](https://github.com/Agoric/agoric-sdk/commit/71c85ecb372c321d5a1f935952aa31b510007498)), closes [#3133](https://github.com/Agoric/agoric-sdk/issues/3133) [#3106](https://github.com/Agoric/agoric-sdk/issues/3106)
* **xs-worker:** respect !managerOptions.metered ([#3078](https://github.com/Agoric/agoric-sdk/issues/3078)) ([84fa8c9](https://github.com/Agoric/agoric-sdk/commit/84fa8c984bc0bccb2482007d69dfb01773de6c74))
* remove references to @agoric/babel-parser ([e4b1e2b](https://github.com/Agoric/agoric-sdk/commit/e4b1e2b4bb13436ef53f055136a4a1d5d933d99e))
* solve nondeterminism in rollup2 output order ([c72b52d](https://github.com/Agoric/agoric-sdk/commit/c72b52d69d5ca4609ce648f24c9d30f66b200374))
* upgrade acorn and babel parser ([048cc92](https://github.com/Agoric/agoric-sdk/commit/048cc925b3090f77e998fef1f3ac26846c4a8f26))



## [0.17.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.17.1...@agoric/swingset-vat@0.17.2) (2021-05-10)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.17.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.17.0...@agoric/swingset-vat@0.17.1) (2021-05-05)


### Bug Fixes

* **swingset:** force vattp to run on worker=local for now ([a6aff0a](https://github.com/Agoric/agoric-sdk/commit/a6aff0ac52de6ecd12b9b1c5c82958f502b549b3)), closes [#3039](https://github.com/Agoric/agoric-sdk/issues/3039)





# [0.17.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.16.4...@agoric/swingset-vat@0.17.0) (2021-05-05)


### Bug Fixes

* disable comms vat termination via remote comms errors ([d286fbd](https://github.com/Agoric/agoric-sdk/commit/d286fbde334433a27ac21709797e6c10cd7f8599))
* **liveslots:** low-level vat dispatch() is now async ([1a6ae48](https://github.com/Agoric/agoric-sdk/commit/1a6ae480c74993f2dc620079e27640a1ba536802)), closes [#2671](https://github.com/Agoric/agoric-sdk/issues/2671) [#2660](https://github.com/Agoric/agoric-sdk/issues/2660)
* **swingset:** add GC stubs: syscall/dispatch retireImports/Exports ([fa24bb9](https://github.com/Agoric/agoric-sdk/commit/fa24bb991d69fd01d410685c867578590f99249b)), closes [#2724](https://github.com/Agoric/agoric-sdk/issues/2724)
* **swingset:** create dynamic vats with the right options ([66fc842](https://github.com/Agoric/agoric-sdk/commit/66fc8423f57101998394c0e31e539d0c0d0ac8c7))
* **swingset:** disable GC for now ([e93066f](https://github.com/Agoric/agoric-sdk/commit/e93066f7b9bebecced901fcb7cbf5d445f78dcf9)), closes [#2724](https://github.com/Agoric/agoric-sdk/issues/2724)
* **swingset:** recreateDynamicVat() waits for vat creation ([fe6ab38](https://github.com/Agoric/agoric-sdk/commit/fe6ab38be097e2a9ec525704f3f346fda68eaf64)), closes [#2871](https://github.com/Agoric/agoric-sdk/issues/2871)
* **swingset:** refactor dispatch() ([ec2e993](https://github.com/Agoric/agoric-sdk/commit/ec2e993f53f168531010b8ad09a197109d33a425))
* **swingset:** schedule vat creation on the run-queue ([51cf813](https://github.com/Agoric/agoric-sdk/commit/51cf813b248fc97966566f5f73c7d351ae646869)), closes [#2911](https://github.com/Agoric/agoric-sdk/issues/2911)
* **swingset:** speed up vat-admin tests by pre-bundling the kernel ([51d06e8](https://github.com/Agoric/agoric-sdk/commit/51d06e8827558ba9ae30c9d4e0e5bd7adf59a1b0))
* **swingset:** stop rejecting metered=true for xs-worker ([3714ed9](https://github.com/Agoric/agoric-sdk/commit/3714ed9fc5b62b39b2c04e7b24bb6e985268036a)), closes [#2868](https://github.com/Agoric/agoric-sdk/issues/2868)
* **swingset:** supervisor-xs: tolerate console.log(BigInt) ([#2967](https://github.com/Agoric/agoric-sdk/issues/2967)) ([cddd949](https://github.com/Agoric/agoric-sdk/commit/cddd949d3d8e986c24feb6af5bdf6be606af9374)), closes [#2936](https://github.com/Agoric/agoric-sdk/issues/2936)
* **swingset:** test metering on both local and xsnap workers ([1e50fa4](https://github.com/Agoric/agoric-sdk/commit/1e50fa49286a9a3240d17dd53b4e645577f4bbc2)), closes [#2972](https://github.com/Agoric/agoric-sdk/issues/2972)
* **xs-worker:** provide error message on vat creation failure ([6a1705e](https://github.com/Agoric/agoric-sdk/commit/6a1705edc5565f6b0320f40e1496a230fd3ad8f3))
* add missing syscalls to kernel stats collection ([1617918](https://github.com/Agoric/agoric-sdk/commit/1617918378bf8fb76e33b55068c43d0e0e278706))
* add noIbids option ([#2886](https://github.com/Agoric/agoric-sdk/issues/2886)) ([39388bc](https://github.com/Agoric/agoric-sdk/commit/39388bc6b96c6b05b807d8c44614b9acb670467d))
* add tests and correct issues the tests found ([0d42e64](https://github.com/Agoric/agoric-sdk/commit/0d42e649866ee93d95d7bf8985d95f455d08a736))
* handle transient 0 refCounts correctly ([9975d75](https://github.com/Agoric/agoric-sdk/commit/9975d7505773f1573325219ccf908291aafee4df))
* incorporate review feedback and other bits of tidying up ([235957b](https://github.com/Agoric/agoric-sdk/commit/235957b8e4c845f00e0fe4bb93c37f4cd18d8fd2))
* remove deprecated ibid support ([#2898](https://github.com/Agoric/agoric-sdk/issues/2898)) ([f865a2a](https://github.com/Agoric/agoric-sdk/commit/f865a2a8fb5d6cb1d16d9fc21ad4868ea6d5a294)), closes [#2896](https://github.com/Agoric/agoric-sdk/issues/2896) [#2896](https://github.com/Agoric/agoric-sdk/issues/2896) [#2896](https://github.com/Agoric/agoric-sdk/issues/2896)
* settle REMOTE_STYLE name ([#2900](https://github.com/Agoric/agoric-sdk/issues/2900)) ([3dc6638](https://github.com/Agoric/agoric-sdk/commit/3dc66385b85cb3e8a1056b8d6e64cd3e448c041f))
* update types and implementation now that Far preserves them ([a4695c4](https://github.com/Agoric/agoric-sdk/commit/a4695c43a09abc92a20c12104cfbfefb4cae2ff2))
* **swingset:** when a static vat dies, tolerate lack of next-of-kin ([215dfb9](https://github.com/Agoric/agoric-sdk/commit/215dfb95cbe90767df9740aa80174b9d0e23921b))


### Features

* load virtual objects when accessed, not when deserialized ([5e659e6](https://github.com/Agoric/agoric-sdk/commit/5e659e6d85061dfd39a3ac7fb8e2d259ac78458e))
* **swingset:** add WeakRef tracking to liveslots ([6309e5f](https://github.com/Agoric/agoric-sdk/commit/6309e5fcc60503610381ea1cb4b906beb8e8e4fc)), closes [#2664](https://github.com/Agoric/agoric-sdk/issues/2664) [#2660](https://github.com/Agoric/agoric-sdk/issues/2660)
* implement the comms vat driver for testing the comms vat ([6793925](https://github.com/Agoric/agoric-sdk/commit/67939254c442befe08e7733cf8677d71e1777af1))
* keep all comms vat state in a persistent store ([51d7204](https://github.com/Agoric/agoric-sdk/commit/51d72040d8409d9b9be117f8101164fe97b99044))
* keep persistent comms vat state in the vatstore ([c55401b](https://github.com/Agoric/agoric-sdk/commit/c55401b7452a04d6cf58abe9a70f541daf9c034a))
* refcount-based promise GC in the comms vat ([209b034](https://github.com/Agoric/agoric-sdk/commit/209b034f196d46f5d6b499f8b0bf32dbddca1114))
* support promise retirement in comms vat ([a9b826f](https://github.com/Agoric/agoric-sdk/commit/a9b826f34ed5a6ea6e1a77acf7cfb491648fd058))





## [0.16.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.16.3...@agoric/swingset-vat@0.16.4) (2021-04-22)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.16.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.16.2...@agoric/swingset-vat@0.16.3) (2021-04-18)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.16.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.16.1...@agoric/swingset-vat@0.16.2) (2021-04-16)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.16.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.16.0...@agoric/swingset-vat@0.16.1) (2021-04-14)

**Note:** Version bump only for package @agoric/swingset-vat





# [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.15.1...@agoric/swingset-vat@0.16.0) (2021-04-13)


### Bug Fixes

* **network:** append the connection instance to the full localAddr ([ebd5963](https://github.com/Agoric/agoric-sdk/commit/ebd5963a2550907ea3966239327f02fb67ee5095))
* fully implement onInbound for unique connection ID ([421b9d4](https://github.com/Agoric/agoric-sdk/commit/421b9d432e26670f223518acbaf7d9bd55d63ca3))
* honour logging sent exceptions with DEBUG=SwingSet:ls ([db9b46a](https://github.com/Agoric/agoric-sdk/commit/db9b46af0a01eac00941f8c902ceedfb3a9938f6))


### Features

* **network:** allow onInstantiate to augment localAddress ([9cfc2fd](https://github.com/Agoric/agoric-sdk/commit/9cfc2fd58e9bd9076d4dc91af46b65e4c5729e54))





## [0.15.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.15.0...@agoric/swingset-vat@0.15.1) (2021-04-07)

**Note:** Version bump only for package @agoric/swingset-vat





# [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.14.0...@agoric/swingset-vat@0.15.0) (2021-04-06)


### Bug Fixes

* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))
* use SWINGSET_WORKER_TYPE to avoid WORKER_TYPE ambiguity ([c4616f1](https://github.com/Agoric/agoric-sdk/commit/c4616f1db0f2668eef5dbb97e30800d4e9caf3a0))
* **swingset:** path -> paths typo in require.resolve options ([58a0d0a](https://github.com/Agoric/agoric-sdk/commit/58a0d0a822a2d370d0d93af49a3644855adda729))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric-sdk/issues/2709)) ([85b674e](https://github.com/Agoric/agoric-sdk/commit/85b674e7942443219fa9828841cc7bd8ef909b47))


### Features

* **swingset:** boot xsnap workers from snapshot ([2476e6f](https://github.com/Agoric/agoric-sdk/commit/2476e6f0e65ef35917a2ee11603376887fc88ab3))
* **swingset:** config for xs-worker vs. local default ([973b403](https://github.com/Agoric/agoric-sdk/commit/973b4039056a42fc1f5004b48af4e9fbcafb71aa))
* **swingset:** provide name to xsnap via managerOptions ([78b428d](https://github.com/Agoric/agoric-sdk/commit/78b428df4984d855a6eb2e0007d5dd2a17839abf))





# [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.13.0...@agoric/swingset-vat@0.14.0) (2021-03-24)


### Bug Fixes

* **swingset:** add dummy dispatch.dropExports to liveslots/comms/managers ([5108ad6](https://github.com/Agoric/agoric-sdk/commit/5108ad61459d0ac885489959586b0afe3c49ff71)), closes [#2653](https://github.com/Agoric/agoric-sdk/issues/2653)
* correct minor found by typechecking ([342c851](https://github.com/Agoric/agoric-sdk/commit/342c851609bac5de64c3a4cbe1e05a246fb2abcf))
* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)
* rename crankStats -> meterUsage ([e0fa380](https://github.com/Agoric/agoric-sdk/commit/e0fa380220a9b0bbc555e55c1d6481c9e48add9b))
* use WeakSet for disavowals, improve comments, tidy vatPowers ([f9b5133](https://github.com/Agoric/agoric-sdk/commit/f9b5133ba48f389af0ecd9c20db9d0447e3db32d))
* **swingset:** add vatOptions.enableDisavow, dummy vatPowers.disavow ([4f43a5c](https://github.com/Agoric/agoric-sdk/commit/4f43a5cb62c838b25a5c59f178b902467da94fb9)), closes [#2635](https://github.com/Agoric/agoric-sdk/issues/2635)
* **swingset:** partially implement syscall.dropImports and disavow ([2490de5](https://github.com/Agoric/agoric-sdk/commit/2490de58643ffdc7e40f77294829ea7ed04e42ee)), closes [#2646](https://github.com/Agoric/agoric-sdk/issues/2646) [#2635](https://github.com/Agoric/agoric-sdk/issues/2635) [#2636](https://github.com/Agoric/agoric-sdk/issues/2636)


### Features

* add message sequence number to comms protocol ([d58cfa4](https://github.com/Agoric/agoric-sdk/commit/d58cfa416ad3b8ad3d5cef4c4616c1557a8efd6c))
* **SwingSet:** track the meter usage in deliverResults[2] ([c1a2388](https://github.com/Agoric/agoric-sdk/commit/c1a23887ca016007ff5ab38f77b8d9f560ce43a8))
* introduce slogCallbacks for the host to handle slog calls ([e2eb92e](https://github.com/Agoric/agoric-sdk/commit/e2eb92e1833b0623045b25b8de7a971cc8c9eba4))





# [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.12.1...@agoric/swingset-vat@0.13.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **avaXS:** notDeepEqual confused false with throwing ([a1b7460](https://github.com/Agoric/agoric-sdk/commit/a1b74604a63b89dc499e58e72b8425effae0b809))
* **swingset:** add exit/vatstore syscalls to non-local vat workers ([35fceb1](https://github.com/Agoric/agoric-sdk/commit/35fceb1a74b4f659d18ff3d7d6e28660757c9fa6))
* **swingset:** allow Symbol.asyncIterator as a method name ([7947be7](https://github.com/Agoric/agoric-sdk/commit/7947be7803a3a3848079b271314c587508a3e5db)), closes [#2481](https://github.com/Agoric/agoric-sdk/issues/2481) [#2619](https://github.com/Agoric/agoric-sdk/issues/2619)
* **swingset:** more Far/Data on the network vat ([ce82afc](https://github.com/Agoric/agoric-sdk/commit/ce82afc47a4a135cbc71478ad0d1836ad79a21f0))
* **swingset:** remove Far/Remotable/getInterfaceOf from vatPowers ([c19a941](https://github.com/Agoric/agoric-sdk/commit/c19a9417ec995425eb67c8a2080b1b0e660420ef)), closes [#2637](https://github.com/Agoric/agoric-sdk/issues/2637)
* bug [#2533](https://github.com/Agoric/agoric-sdk/issues/2533), problem deleting virtual objects ([3645430](https://github.com/Agoric/agoric-sdk/commit/3645430e11c8e38d4deac88bf14e60f4561b2441))
* eliminate redundant resolves in comms ([86057fc](https://github.com/Agoric/agoric-sdk/commit/86057fc807f769e947ec4e45a0abed76fa6ff481))
* fake needs to be more real to work outside SwingSet unit tests ([9871903](https://github.com/Agoric/agoric-sdk/commit/9871903a34899f2852e831aab4d1dadb2b6ae703))
* remove resolveToRemote plumbing for clist-outbound.js ([caa367d](https://github.com/Agoric/agoric-sdk/commit/caa367d9ca355feb82b79928cde8eb92b4c093bf))
* weaken timer wakers to ERefs ([dda396f](https://github.com/Agoric/agoric-sdk/commit/dda396fbef9c407cf5c151ebdb783954c678ee08))
* **slogger:** do not harden the data being recorded ([e75ef53](https://github.com/Agoric/agoric-sdk/commit/e75ef53f726c7e44eec4ad8cd7718471d03c326e)), closes [#2517](https://github.com/Agoric/agoric-sdk/issues/2517)
* **xs-worker:** handle bigint in testLog a la kernel.js ([b362d8b](https://github.com/Agoric/agoric-sdk/commit/b362d8b66562bd63690b6d27483fc5fa12c22bd6))


### Features

* **SwingSet:** direct liveslots errors to a different console ([9eec3e3](https://github.com/Agoric/agoric-sdk/commit/9eec3e31d85da9467b5bfda69851c11b817e8611))
* declarative environments import for SwingSet, zoe tests ([#2580](https://github.com/Agoric/agoric-sdk/issues/2580)) ([bb0e7d6](https://github.com/Agoric/agoric-sdk/commit/bb0e7d604a9d789f9df0c6863e79a039f3b2f052))
* enable comms starting ID to be configurable in comms vats ([6c0b4d8](https://github.com/Agoric/agoric-sdk/commit/6c0b4d8e9b2e75931351b67390e0aebc9c90a0e9))
* implement a mock virtual object manager to support unit tests outside SwingSet ([d4f5025](https://github.com/Agoric/agoric-sdk/commit/d4f50257e1b7fb6812590c9cf806279ec518841b))
* push metrics from autobench ([3efc212](https://github.com/Agoric/agoric-sdk/commit/3efc21206ab6693abe94a4b7d2946b50e29983a9))





## [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.12.0...@agoric/swingset-vat@0.12.1) (2021-02-22)


### Bug Fixes

* protect testLog against BigInts ([60c4684](https://github.com/Agoric/agoric-sdk/commit/60c468477de3c24dbf39866e010f3ea22cbb195a))





# [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.11.0...@agoric/swingset-vat@0.12.0) (2021-02-16)


### Bug Fixes

* cleanups and simplifications ([1fe4eae](https://github.com/Agoric/agoric-sdk/commit/1fe4eae27cbe6e97b5f905d921d3e72d167cd108))
* Correlate sent errors with received errors ([73b9cfd](https://github.com/Agoric/agoric-sdk/commit/73b9cfd33cf7842bdc105a79592028649cb1c92a))
* exercise callNow in local-worker case ([c3c489e](https://github.com/Agoric/agoric-sdk/commit/c3c489e62867a86d8c9e2e66812eb55e7295c8ec)), closes [#1617](https://github.com/Agoric/agoric-sdk/issues/1617)
* Far and Remotable do unverified local marking rather than WeakMap ([#2361](https://github.com/Agoric/agoric-sdk/issues/2361)) ([ab59ab7](https://github.com/Agoric/agoric-sdk/commit/ab59ab779341b9740827b7c4cca4680e7b7212b2))
* hush "replaying transcripts" message during swingset startup ([#2394](https://github.com/Agoric/agoric-sdk/issues/2394)) ([9309dd9](https://github.com/Agoric/agoric-sdk/commit/9309dd99f68d17df7ca54ef561a9e6e383e1eb0e)), closes [#2277](https://github.com/Agoric/agoric-sdk/issues/2277)
* improve test-worker.js to assert promise results are correct ([73487b1](https://github.com/Agoric/agoric-sdk/commit/73487b12bbb656cd3809fc7f17c7b85f20f6e4ef)), closes [#1778](https://github.com/Agoric/agoric-sdk/issues/1778)
* link all the errors ([6ea7588](https://github.com/Agoric/agoric-sdk/commit/6ea75880ce0ac56ebf1e2187593f42010f5aa929))
* remove crankNumber from transcript entries ([#2429](https://github.com/Agoric/agoric-sdk/issues/2429)) ([d7886c0](https://github.com/Agoric/agoric-sdk/commit/d7886c08e81d64005ca9e9aeaea228ea49bc995f)), closes [#2400](https://github.com/Agoric/agoric-sdk/issues/2400) [#2428](https://github.com/Agoric/agoric-sdk/issues/2428)
* removed another q ([8e20245](https://github.com/Agoric/agoric-sdk/commit/8e202455604a1a5ec1e500ea8b0de05a7ef87d51))
* review comments ([17d7df6](https://github.com/Agoric/agoric-sdk/commit/17d7df6ee06eb5c340500bb5582f985c2993ab19))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* take advantage of `/.../` being stripped from stack traces ([7acacc0](https://github.com/Agoric/agoric-sdk/commit/7acacc0d6ac06c37065ce984cc9147c945c572e5))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))
* **kernel:** don't lose managerType ([37d169e](https://github.com/Agoric/agoric-sdk/commit/37d169ea3ae89d68c009065dedf886e6f786eb77))
* **swingset:** implement replayTranscript for all vat types ([7fde6a4](https://github.com/Agoric/agoric-sdk/commit/7fde6a46dbc392e61dc987f967303cf0884a230f))
* **swingset:** loadVat.js: properly wait for static vats to be ready ([ca4188b](https://github.com/Agoric/agoric-sdk/commit/ca4188b621f6fc175f682cc227cc3131dd1043f5)), closes [#2213](https://github.com/Agoric/agoric-sdk/issues/2213)
* **swingset:** test-worker.js: disable XS test until xsnap is ready ([61b2567](https://github.com/Agoric/agoric-sdk/commit/61b25674cb2493330f3e80eee3de870b8484d9cb))
* **xs-worker:** restore xs vat manager test to working order ([9274082](https://github.com/Agoric/agoric-sdk/commit/92740823d8be398c458fc102b889a4d0baf66de0)), closes [TypeError#2](https://github.com/TypeError/issues/2)
* tolerate symbols as property names ([#2094](https://github.com/Agoric/agoric-sdk/issues/2094)) ([15022fe](https://github.com/Agoric/agoric-sdk/commit/15022fe7f3fd3d1fc67687f3b010968725c30a7e))


### Features

* use xsnap worker CPU meter and start reporting consumption ([62e0d5a](https://github.com/Agoric/agoric-sdk/commit/62e0d5a3b5ff32bd79567bab8fa1b63eb7f9134a))
* vat-side promise ID retirement ([94e0078](https://github.com/Agoric/agoric-sdk/commit/94e0078673ff15e47c2fcf32f472d27c416a1cd8))
* **swingset:** defaultManagerType option in makeSwingsetController ([#2266](https://github.com/Agoric/agoric-sdk/issues/2266)) ([b57f08f](https://github.com/Agoric/agoric-sdk/commit/b57f08f3514e052126a758f949acb5db3cc5a32d)), closes [#2260](https://github.com/Agoric/agoric-sdk/issues/2260)
* **swingset:** xsnap vat worker ([#2225](https://github.com/Agoric/agoric-sdk/issues/2225)) ([50c8548](https://github.com/Agoric/agoric-sdk/commit/50c8548e4d610e1e32537bc155e4c58d917cd6df)), closes [#2216](https://github.com/Agoric/agoric-sdk/issues/2216) [#2202](https://github.com/Agoric/agoric-sdk/issues/2202)
* add a notifier to the timerService ([#2143](https://github.com/Agoric/agoric-sdk/issues/2143)) ([3cb4606](https://github.com/Agoric/agoric-sdk/commit/3cb46063080dd4fac27507ad0062e54dbf82eda4))
* finish support for notifying multiple promises at once ([83c6c33](https://github.com/Agoric/agoric-sdk/commit/83c6c339f8ce31e8f8066e013a8f4bc5049cf6e2))
* pluralize `resolve` syscall ([6276286](https://github.com/Agoric/agoric-sdk/commit/6276286b5553f13d3cb267c8015f83921a6caf9d))
* promise resolution notification refactoring ([4ffb911](https://github.com/Agoric/agoric-sdk/commit/4ffb91147dbdae971111d7f2fa1e5c9cdc1ae578))
* refactor notification and subscription ([dd5f7f7](https://github.com/Agoric/agoric-sdk/commit/dd5f7f7fc5b6ae7f8bee4f123821d92a26581af4))
* retire C-list entries for resolved promises ([13f96aa](https://github.com/Agoric/agoric-sdk/commit/13f96aa2b15ec01509d6c594c61d9b3c15109997))





# [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.10.0...@agoric/swingset-vat@0.11.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* The Slogulator Mk I ([42c5fdc](https://github.com/Agoric/agoric-sdk/commit/42c5fdcb78aa058a72db96adce19e8b8e1b7eba7))





# [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.10.0-dev.0...@agoric/swingset-vat@0.10.0) (2020-11-07)


### Bug Fixes

* add liveslots-provided globals to vat Compartments ([3c79d51](https://github.com/Agoric/agoric-sdk/commit/3c79d516b7b3adfbe0f02ff809290acbc9079d44)), closes [#455](https://github.com/Agoric/agoric-sdk/issues/455) [#1846](https://github.com/Agoric/agoric-sdk/issues/1846) [#1867](https://github.com/Agoric/agoric-sdk/issues/1867)
* add stubs for GC tools (no-op on Node v12) ([7ecc184](https://github.com/Agoric/agoric-sdk/commit/7ecc1845c4f364660e66a42c5745d6d7225b76b6)), closes [#1872](https://github.com/Agoric/agoric-sdk/issues/1872) [#1925](https://github.com/Agoric/agoric-sdk/issues/1925)
* add vatDecRef to kernel, offer to liveslots ([#1926](https://github.com/Agoric/agoric-sdk/issues/1926)) ([527b44a](https://github.com/Agoric/agoric-sdk/commit/527b44a934937c71d18a0a702758132b5b77e1ed)), closes [#1872](https://github.com/Agoric/agoric-sdk/issues/1872)
* correct oversights & editing errors in virtual object code ([581fb91](https://github.com/Agoric/agoric-sdk/commit/581fb915486238a785130a2d4c2141539b3b2e49))
* further cleanup based on reviews ([2e74cc7](https://github.com/Agoric/agoric-sdk/commit/2e74cc72ce1c898b24c1a2613d7864d97fe383c2))
* more tests and further refinements ([72f9624](https://github.com/Agoric/agoric-sdk/commit/72f9624b0809fe10d6023ac5591c01acb2e3bdfe))
* refactor liveSlots so it could provide vat globals ([165205f](https://github.com/Agoric/agoric-sdk/commit/165205f5480eed0374627b72e41248ee085b9771)), closes [#1867](https://github.com/Agoric/agoric-sdk/issues/1867)
* remove unused 'state' arg from makeLiveslots() ([#1893](https://github.com/Agoric/agoric-sdk/issues/1893)) ([c2f7910](https://github.com/Agoric/agoric-sdk/commit/c2f79101e6e07b8afe3eadb906d5744b331d75e6))
* rework virtual objects implementation to use revised API design ([4c4c1c9](https://github.com/Agoric/agoric-sdk/commit/4c4c1c93f862b3aea990c7c7d556b7c6b949448d))
* track initializations in progress with a WeakSet ([f06f0fe](https://github.com/Agoric/agoric-sdk/commit/f06f0fef34747c42f1c59b39907d2a8ee4642e25))
* various cleanups and simplifications in virtualObjectManager, enable cache size as config param ([d564817](https://github.com/Agoric/agoric-sdk/commit/d564817d69cdabd7e52b41d95a1bdf0f987d521a))
* WeakRef taming follows taming pattern ([#1931](https://github.com/Agoric/agoric-sdk/issues/1931)) ([3949dfb](https://github.com/Agoric/agoric-sdk/commit/3949dfbc6284e40f69f7ceff21ed9a414dcdcbd4))


### Features

* **assert:** Thread stack traces to console, add entangled assert ([#1884](https://github.com/Agoric/agoric-sdk/issues/1884)) ([5d4f35f](https://github.com/Agoric/agoric-sdk/commit/5d4f35f901f2ca40a2a4d66dab980a5fe8e575f4))
* implement virtual objects kept in vat secondary storage ([9f4ae1a](https://github.com/Agoric/agoric-sdk/commit/9f4ae1a4ecda4245291f846149bab6c95c96634c))





# [0.10.0-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.9.0...@agoric/swingset-vat@0.10.0-dev.0) (2020-10-19)


### Features

* add vatstorage syscalls to kernel ([90ef974](https://github.com/Agoric/agoric-sdk/commit/90ef974eed85bcb97126c45652e785ac243b9894))





# [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.8.1-dev.2...@agoric/swingset-vat@0.9.0) (2020-10-11)


### Bug Fixes

* add netstring encode/decode/stream library ([fd1da9e](https://github.com/Agoric/agoric-sdk/commit/fd1da9e94ff64f941c5f667e124f55ef27d03fb6)), closes [#1797](https://github.com/Agoric/agoric-sdk/issues/1797) [#1807](https://github.com/Agoric/agoric-sdk/issues/1807)
* change encoders/decoders for kernel-worker protocol endpoints ([8eb13fa](https://github.com/Agoric/agoric-sdk/commit/8eb13fa4940dbd4574e15bbcd14adcc812520b27))
* clean up some debug log messages for consistency ([56a0763](https://github.com/Agoric/agoric-sdk/commit/56a076320593f23fcb65cd118f0481ef40898a6a))
* clean up worker subprocess spawning ([afeced8](https://github.com/Agoric/agoric-sdk/commit/afeced85a7f3523aed3655c3d498ecdc9314ef02)), closes [#1777](https://github.com/Agoric/agoric-sdk/issues/1777)
* handle syscallResult and deliveryResult consistently among workers ([9e6e31a](https://github.com/Agoric/agoric-sdk/commit/9e6e31ac55521893b6fdf31785bb901345ed46af)), closes [#1775](https://github.com/Agoric/agoric-sdk/issues/1775)
* have liveSlots reject Promise arguments in D() invocations ([#1803](https://github.com/Agoric/agoric-sdk/issues/1803)) ([cdcf99d](https://github.com/Agoric/agoric-sdk/commit/cdcf99dd3e510a4f79bf55a823b62c2070038685)), closes [#1358](https://github.com/Agoric/agoric-sdk/issues/1358)
* improved error message when eventual send target is undefined ([#1847](https://github.com/Agoric/agoric-sdk/issues/1847)) ([f33d30e](https://github.com/Agoric/agoric-sdk/commit/f33d30e46eeb209f039e81a92350c06611cc45a1))
* loadVat should accept managerType= in options ([e9838f1](https://github.com/Agoric/agoric-sdk/commit/e9838f13853baa2f1c63d78dde0ca04bba688196))
* new 'worker-protocol' module to do Array-to-Buffer conversion ([e23b7bb](https://github.com/Agoric/agoric-sdk/commit/e23b7bb40e20bacf7f64c627333918e7d5137560))
* pass testLog to all vatWorkers ([29bc81a](https://github.com/Agoric/agoric-sdk/commit/29bc81a46d057532f51c37bed081d850cf7f31db)), closes [#1776](https://github.com/Agoric/agoric-sdk/issues/1776)
* rename netstring exports, clean up object modes ([e2bbaa2](https://github.com/Agoric/agoric-sdk/commit/e2bbaa25c53fd37bc26cd2d5d9f01710b0e06243))
* stop using netstring-stream ([6ac996c](https://github.com/Agoric/agoric-sdk/commit/6ac996c00b876bac89ba99677bc5b66502506f4b))
* tweaks from review comments ([bccad6b](https://github.com/Agoric/agoric-sdk/commit/bccad6b6ae7997dd60425cbba30c993eb1378666))
* update @agoric/store types and imports ([9e3493a](https://github.com/Agoric/agoric-sdk/commit/9e3493ad4d8c0a6a9230ad6a4c22a3254a867115))
* **swingset:** add 'slogFile' option to write slog to a file ([f97ef41](https://github.com/Agoric/agoric-sdk/commit/f97ef4152dc2074b82823a9ff8595e4b9a04395c))


### Features

* accept 'description' in vat creation options, pass to slog ([cb2d73b](https://github.com/Agoric/agoric-sdk/commit/cb2d73b7b1b5e63d4de611d3fec6dc381e38e3fc))
* overhaul kernel initialization and startup ([23c3f9d](https://github.com/Agoric/agoric-sdk/commit/23c3f9df56940230e21a16b4861f40197192fdea))
* revamp vat termination API ([aa5b93c](https://github.com/Agoric/agoric-sdk/commit/aa5b93c7ea761bf805206c71bb16e586267db74d))





## [0.8.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.8.1-dev.1...@agoric/swingset-vat@0.8.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.8.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.8.1-dev.0...@agoric/swingset-vat@0.8.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.8.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.8.0...@agoric/swingset-vat@0.8.1-dev.0) (2020-09-18)


### Bug Fixes

* restore deleted comments ([9ed1f7d](https://github.com/Agoric/agoric-sdk/commit/9ed1f7d23aca6287194454f500e6238ad6f1c504))





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.7.1...@agoric/swingset-vat@0.8.0) (2020-09-16)


### Bug Fixes

* add TODO unimplemented for liveSlots synthetic presences ([6089e71](https://github.com/Agoric/agoric-sdk/commit/6089e71aaa48867625c19d2f64c6e5b29880b7ad))
* allow local Presences to receive deliveries as well ([93c8933](https://github.com/Agoric/agoric-sdk/commit/93c8933b5c2bdafec26b325e0d3fc6e88978d199)), closes [#1719](https://github.com/Agoric/agoric-sdk/issues/1719)
* eliminate unnecessary try/catch ([f3dc45c](https://github.com/Agoric/agoric-sdk/commit/f3dc45c63f0278e10ff1ee2eb08f3f7045b46d52))
* fix bug [#1491](https://github.com/Agoric/agoric-sdk/issues/1491), bogus hostStorage setup in test ([eb30411](https://github.com/Agoric/agoric-sdk/commit/eb304119f169f2c983ddcccc07376c32f1d05b91))
* fix bug [#1544](https://github.com/Agoric/agoric-sdk/issues/1544), type check store parameters instead of coercing ([6d9b4b8](https://github.com/Agoric/agoric-sdk/commit/6d9b4b80111318ecc36949d47f06514a5f4aec95))
* fix bug [#1609](https://github.com/Agoric/agoric-sdk/issues/1609), confusing error message on malformed vat code ([0c7e162](https://github.com/Agoric/agoric-sdk/commit/0c7e162eeca969d21fb8067e6b4690ae567e72e2))
* implement epochs and make tolerant of restarts ([1c786b8](https://github.com/Agoric/agoric-sdk/commit/1c786b861a445891d09df2f1a47d689d641a0c5f))
* make setState asynchronous ([73f9d40](https://github.com/Agoric/agoric-sdk/commit/73f9d40eb9e3f1b8a08355d0ba9d8835421093dd))
* pass through the entire marshal stack to the vat ([f93c26b](https://github.com/Agoric/agoric-sdk/commit/f93c26b602766c9d8e3eb15740236cf81b38387f))
* properly load and restore plugin device state ([6461fb8](https://github.com/Agoric/agoric-sdk/commit/6461fb84921fcb9f1b71b7e102229c336b04558e))
* reject promises in the arguments to syscall.callNow() ([7472661](https://github.com/Agoric/agoric-sdk/commit/747266162bc84378ebf5fc2290b4dbb45cd585fc)), closes [#1346](https://github.com/Agoric/agoric-sdk/issues/1346) [#1358](https://github.com/Agoric/agoric-sdk/issues/1358) [#1358](https://github.com/Agoric/agoric-sdk/issues/1358)
* remove ancient 'resolver' vatSlot type ([4adcd58](https://github.com/Agoric/agoric-sdk/commit/4adcd5877b8cbb1e852e6ef57f4b863b2096ac14))
* restoring most state, just need to isolate the plugin captp ([f92ee73](https://github.com/Agoric/agoric-sdk/commit/f92ee731afa69435b10b94cf4a483f25bed7a668))
* restrict plugins to be loaded only from ./plugins ([2ba608e](https://github.com/Agoric/agoric-sdk/commit/2ba608e46c6d8d33bdfca03a32af09f9cde3cc34))


### Features

* add local.plugin~.getPluginDir() ([94e7016](https://github.com/Agoric/agoric-sdk/commit/94e70164c1be5f68aaadfcf75223c441cde9f876))
* implement CapTP forwarding over a plugin device ([b4a1be8](https://github.com/Agoric/agoric-sdk/commit/b4a1be8f600d60191570a3bbf42bc4c82af47b06))
* properly terminate & clean up after failed vats ([cad2b2e](https://github.com/Agoric/agoric-sdk/commit/cad2b2e45aece7dbc150c40dea194a3fea5dbb69))





## [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.7.0...@agoric/swingset-vat@0.7.1) (2020-08-31)

**Note:** Version bump only for package @agoric/swingset-vat





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.6.0...@agoric/swingset-vat@0.7.0) (2020-08-31)


### Bug Fixes

* add "TODO unimplemented"s ([#1580](https://github.com/Agoric/agoric-sdk/issues/1580)) ([7795f93](https://github.com/Agoric/agoric-sdk/commit/7795f9302843a2c94d4a2f42cb22affe1e91d41d))
* better debugging of three-party handoff ([f4c6442](https://github.com/Agoric/agoric-sdk/commit/f4c6442211118e03b214e12ee15a10fd637b4a6e))
* clean up review issues ([9ad3b79](https://github.com/Agoric/agoric-sdk/commit/9ad3b79fe59055077ebdba5fcba762038f0f9fb2))
* cope with delivery failures after replay due to dead vats ([37dba42](https://github.com/Agoric/agoric-sdk/commit/37dba4263f8aa2d25da402cabdf5601130d7cd45))
* correct minor documentation error ([6856de0](https://github.com/Agoric/agoric-sdk/commit/6856de00d57ae70a21297fbc2aa3abcc5449a679))
* correct problems that benchmarking turned up ([30f3f87](https://github.com/Agoric/agoric-sdk/commit/30f3f87d4e734b96beaf192f25212dc7d575674d))
* don't modify the original 'config' object ([36496ab](https://github.com/Agoric/agoric-sdk/commit/36496ab03e756cc4b266f8fd623ffeabf97fa9bf)), closes [#1490](https://github.com/Agoric/agoric-sdk/issues/1490)
* downgrade ([f1f7a7b](https://github.com/Agoric/agoric-sdk/commit/f1f7a7b25c59b8ad3c9a5d32425d17d2a4c34bf4))
* excise @agoric/harden from the codebase ([eee6fe1](https://github.com/Agoric/agoric-sdk/commit/eee6fe1153730dec52841c9eb4c056a8c5438b0f))
* handle post-replay notifications to a dead vat ([4c0e343](https://github.com/Agoric/agoric-sdk/commit/4c0e343dc5dd8ed79240cfdd64e19b260ef8b401))
* handle relative paths more better ([e979475](https://github.com/Agoric/agoric-sdk/commit/e979475f4b5c77a1e084f82c814f866bf1a01457))
* minor: rearrange asserts in Remotable ([#1642](https://github.com/Agoric/agoric-sdk/issues/1642)) ([c43a08f](https://github.com/Agoric/agoric-sdk/commit/c43a08fb1733596172a7dc5ca89353d837033e23))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* remove one layer of caching (the mailbox state) ([50b1d7e](https://github.com/Agoric/agoric-sdk/commit/50b1d7e65375c137c8d70093a3f115955d10dec7))
* use REMOTE_STYLE rather than 'presence' to prepare ([#1577](https://github.com/Agoric/agoric-sdk/issues/1577)) ([6b97ae8](https://github.com/Agoric/agoric-sdk/commit/6b97ae8670303631313a65d12393d7ad226b941d))
* **swingset:** add makeNetworkHost to vat-tp ([4520633](https://github.com/Agoric/agoric-sdk/commit/4520633b838bfae8a8fa3b82a0d0029b7fa75280)), closes [#259](https://github.com/Agoric/agoric-sdk/issues/259)
* **swingset:** check promise resolution table during comms.inbound ([e9d921a](https://github.com/Agoric/agoric-sdk/commit/e9d921a68ad567f66e6928cfbddfc0a1bf21e600)), closes [#1400](https://github.com/Agoric/agoric-sdk/issues/1400)
* **swingset:** createVatDynamically option to disable metering ([388af11](https://github.com/Agoric/agoric-sdk/commit/388af112c583d2bbc8fd2f4db218e637ffbeb259)), closes [#1307](https://github.com/Agoric/agoric-sdk/issues/1307)
* **swingset:** remove 'require' from vatEndowments ([4b584df](https://github.com/Agoric/agoric-sdk/commit/4b584df4131812562edf06c9b45b1816dde6e3eb)), closes [#1214](https://github.com/Agoric/agoric-sdk/issues/1214)
* **swingset:** replay dynamic vats properly ([7d631bc](https://github.com/Agoric/agoric-sdk/commit/7d631bccee1ff2cd38219ea2995298a1dbfeec0d)), closes [#1480](https://github.com/Agoric/agoric-sdk/issues/1480)
* **swingset:** rewrite comms, probably add third-party forwarding ([a5f3e04](https://github.com/Agoric/agoric-sdk/commit/a5f3e040b79813ab066fd98b1f093a8585c0c98f)), closes [#1535](https://github.com/Agoric/agoric-sdk/issues/1535) [#1404](https://github.com/Agoric/agoric-sdk/issues/1404)
* remove unnecessary types ([e242143](https://github.com/Agoric/agoric-sdk/commit/e24214342062f908ebee91a775c0427abc21e263))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric-sdk/issues/1628)) ([1bae122](https://github.com/Agoric/agoric-sdk/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))
* tweaks from PR review ([3c51b0f](https://github.com/Agoric/agoric-sdk/commit/3c51b0faca307fac957cf5f0106fe1973615eb68))
* **SwingSet:** reenable getInterfaceOf/Remotable vatPowers ([fd7a8ca](https://github.com/Agoric/agoric-sdk/commit/fd7a8cafa8b8544f4e47738247e1aaab3d980fe8))
* **SwingSet:** remove needless E argument from network functions ([5e5c919](https://github.com/Agoric/agoric-sdk/commit/5e5c9199b17a986bd3089720a8985e49a297c77c))


### Features

* allow pre-built kernelBundles for faster unit tests ([8c0cc8b](https://github.com/Agoric/agoric-sdk/commit/8c0cc8b64a11a50b37a26dd59f338df90ffb9244)), closes [#1643](https://github.com/Agoric/agoric-sdk/issues/1643)
* clean up after dead vats ([7fa2661](https://github.com/Agoric/agoric-sdk/commit/7fa2661eeddcad36609bf9d755ff1c5b07241f53))
* **swingset-vat:** add xs-worker managerType ([2db022d](https://github.com/Agoric/agoric-sdk/commit/2db022d966a416c9b765c18ed543dd5adb31cc6d))
* **xs-vat-worker:** locateWorkerBin finds built executable ([aecaeb1](https://github.com/Agoric/agoric-sdk/commit/aecaeb143668825183c5aa1b9a5c76d954b51501))
* phase 1 of vat termination: stop talking to or about the vat ([0b1aa20](https://github.com/Agoric/agoric-sdk/commit/0b1aa20630e9c33479d2c4c31a07723819598dab))
* Phase 1a of vat termination: reject promises from the dead vat ([80fc527](https://github.com/Agoric/agoric-sdk/commit/80fc5274f2ab295bf00026b30b7bd32d7508c475))
* Phase 2 of vat termination: throw away in memory remnants of dead vat ([9d6ff42](https://github.com/Agoric/agoric-sdk/commit/9d6ff42a081109281fc6e709d311f86d8094be61))
* support use of module references in swingset config sourceSpecs ([1c02653](https://github.com/Agoric/agoric-sdk/commit/1c0265353dcbb88fa5d2c7d80d53ebadee49936d))
* swingset-runner zoe demos to use pre-bundled zcf ([3df964a](https://github.com/Agoric/agoric-sdk/commit/3df964a10f61715fa2d72b1c408bb1903df61181))
* **swingset:** Add Node.js Worker (thread) -based VatManager ([61615a2](https://github.com/Agoric/agoric-sdk/commit/61615a2ea8de19aa4a1cea20960dcbab70db9f39)), closes [#1299](https://github.com/Agoric/agoric-sdk/issues/1299) [#1127](https://github.com/Agoric/agoric-sdk/issues/1127) [#1384](https://github.com/Agoric/agoric-sdk/issues/1384)
* **vattp:** allow specifying a console object for logging ([ae1a2a0](https://github.com/Agoric/agoric-sdk/commit/ae1a2a03bf2f823b5420b8777ec6c436cbb4b349))
* use debugName to differentiate sim-chain instances ([0efc33f](https://github.com/Agoric/agoric-sdk/commit/0efc33fafbeefeff587f94251dc3052179b17642))
* **swingset:** add subprocess+node -based VatManager ([184c912](https://github.com/Agoric/agoric-sdk/commit/184c9126d33a7f987d6d770df39416f0154e1045)), closes [#1374](https://github.com/Agoric/agoric-sdk/issues/1374)
* reintroduce anylogger as the console endowment ([98cd5cd](https://github.com/Agoric/agoric-sdk/commit/98cd5cd5c59e9121169bb8104b70c63ccc7f5f01))





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.5.2...@agoric/swingset-vat@0.6.0) (2020-06-30)


### Bug Fixes

* **swingset:** dynamic vats do not get control over their own metering ([c6e4118](https://github.com/Agoric/agoric-sdk/commit/c6e4118d0ef12a694586994e4c32b3569b6210b3))
* **swingset:** dynamic vats use named buildRootObject export ([605183b](https://github.com/Agoric/agoric-sdk/commit/605183b81bc02191c50d2bdea52bb99861d17055))
* **swingset:** raise meter FULL from 1e7 to 1e8 ([deb2c16](https://github.com/Agoric/agoric-sdk/commit/deb2c16fd6dd45e3e265fa450607ba4397b51505))
* delete c-list entries *before* notifying vats about promise resolutions ([7fb8a1f](https://github.com/Agoric/agoric-sdk/commit/7fb8a1f567cd32198e90e14eebaa6d5575479611))
* don't retire promises that resolve to data structures containing promises ([00098da](https://github.com/Agoric/agoric-sdk/commit/00098da1d9bf80565956d78fe592d78b0be9f2c1))
* Recipient-side resolved promise retirement ([65010cf](https://github.com/Agoric/agoric-sdk/commit/65010cf2a9b6a09e1e55ee63745a5cfc5ddf6cf5))
* Recipient-side resolved promise retirement ([dc0aec9](https://github.com/Agoric/agoric-sdk/commit/dc0aec99658ec0a6dac1d3e52d1f17fdfcd40d0d))
* Resolver-side resolved promise retirement ([401e86a](https://github.com/Agoric/agoric-sdk/commit/401e86a7eba8d018f7cb4284f86f473b94889ac8))
* Resolver-side resolved promise retirement ([7cb2984](https://github.com/Agoric/agoric-sdk/commit/7cb2984ee33e8779ad8713637f125d7b0aaf8bb7))
* update stat collection to account for promise retirement ([3f242dd](https://github.com/Agoric/agoric-sdk/commit/3f242dd2a80bf720830baaaafd4758a5888cd36c))


### Features

* **swingset:** activate metering of dynamic vats ([96eb63f](https://github.com/Agoric/agoric-sdk/commit/96eb63fbd641fdbddbd790c201af9420e9524937))
* **swingset:** allow vats to be defined by a buildRootObject export ([dce1fd4](https://github.com/Agoric/agoric-sdk/commit/dce1fd423f70b2830c77f238586cb58a43aab930))
* add stats collection facility to kernel ([1ea7bb7](https://github.com/Agoric/agoric-sdk/commit/1ea7bb77a3795a9ebadbe80f27a8e4cece3b3c9e))
* count number of times various stats variables are incremented and decremented ([129f02f](https://github.com/Agoric/agoric-sdk/commit/129f02fb3c5a44950fa0ab12a715fc2f18911c08))
* inbound network connection metadata negotiation ([a7ecd9d](https://github.com/Agoric/agoric-sdk/commit/a7ecd9d9a60ba2769b6865fb6c195b569245a260))
* kernel promise reference counting ([ba1ebc7](https://github.com/Agoric/agoric-sdk/commit/ba1ebc7b2561c6a4c856b16d4a24ba38a40d0d74))
* outbound connection metadata negotiation ([5dd2e63](https://github.com/Agoric/agoric-sdk/commit/5dd2e63b8c1fac9543bbb9f9e2f5d8e932efc34a))
* pass blockHeight and blockTime from all IBC events ([79bd316](https://github.com/Agoric/agoric-sdk/commit/79bd3160a3af232b183bcefb8b229fdbf6192c49))
* pass local and remote address to onOpen callback ([2297a08](https://github.com/Agoric/agoric-sdk/commit/2297a089a0fc576a4d958427292b2f174215ad3f))
* support value return from `bootstrap` and other exogenous messages ([a432606](https://github.com/Agoric/agoric-sdk/commit/a43260608412025991bcad3a48b20a486c3dbe15))





## [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.5.1...@agoric/swingset-vat@0.5.2) (2020-05-17)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.5.0...@agoric/swingset-vat@0.5.1) (2020-05-10)


### Bug Fixes

* rewrite liveslots use of HandledPromise, remove deliver() stall ([42c2193](https://github.com/Agoric/agoric-sdk/commit/42c2193ce62f527eb2dfa1b5bed4f8b32f2d452d))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.2...@agoric/swingset-vat@0.5.0) (2020-05-04)


### Bug Fixes

* get the encouragement dIBC working ([6bb1337](https://github.com/Agoric/agoric-sdk/commit/6bb13377c94e25df79481a42c3f280b7f4da43ed))
* harmonise the docs with the implementation ([88d2a0a](https://github.com/Agoric/agoric-sdk/commit/88d2a0aeb5cb6ebbece7bebc090b1b6697fdb8e1))
* ibcports->ibcport ([efb9d95](https://github.com/Agoric/agoric-sdk/commit/efb9d95c8fc5b69e76e9dc52236ebea2f98ee50c))
* improve bridge and network implementation ([1fca476](https://github.com/Agoric/agoric-sdk/commit/1fca4762e7cb458d14499b6b533bc0e4889e3842))
* introduce sleep to help mitigate a relayer race condition ([c0014d3](https://github.com/Agoric/agoric-sdk/commit/c0014d3108f28c01d507da1c7553295a3fde6b06))
* lint... ([1db8eac](https://github.com/Agoric/agoric-sdk/commit/1db8eacd5fdb0e6d6ec6d2f93bd29e7c9291da30))
* message legibilization shouldn't choke on non-JSON-parseable messages ([4267c52](https://github.com/Agoric/agoric-sdk/commit/4267c523c578ab0cc99ab091a27b4ec75ac90015))
* more dIBC inbound work ([6653937](https://github.com/Agoric/agoric-sdk/commit/665393779540c580d57f798aa01c62855e7b5278))
* move "crank 0" commit to after initialized flag is set ([f57c755](https://github.com/Agoric/agoric-sdk/commit/f57c755f9a30fd2200da0a9de8992e0cc0f4b000))
* proper inbound IBC listening ([3988235](https://github.com/Agoric/agoric-sdk/commit/3988235312806711c1837f80788ddc42ae7713dd))
* reimplement crossover connections ([bf3bd2a](https://github.com/Agoric/agoric-sdk/commit/bf3bd2ad78440dad42935e4a30b50de56a77ceba))
* reject all sends when the connection is closed ([61b0975](https://github.com/Agoric/agoric-sdk/commit/61b09750c6c89f0097addd9ee068751bc4a55e56))
* rename host->peer, and implement basic Multiaddr ([ef89315](https://github.com/Agoric/agoric-sdk/commit/ef893151189ab99016910582a8d5ca3aa96c4fda))
* return packet acknowledgements ([4cf6f2f](https://github.com/Agoric/agoric-sdk/commit/4cf6f2f210466fa049361f9d7c115a706ec6ff49))
* return the correct crossover side for inbound ([dc285d7](https://github.com/Agoric/agoric-sdk/commit/dc285d7f80197bf88fcc5961fe758d9cb891d7b4))
* separate multiaddr from network ([f3d7dcb](https://github.com/Agoric/agoric-sdk/commit/f3d7dcb289b376c4083dd63b1b7f8502640a5dc6))
* swingset: remove unused 'inbound' device ([f096e3b](https://github.com/Agoric/agoric-sdk/commit/f096e3b5afa78175f897736c2cf7f68d86dceb12))
* update docs and metadata to require Node.js v12.16.1 or higher ([#938](https://github.com/Agoric/agoric-sdk/issues/938)) ([d4e5f74](https://github.com/Agoric/agoric-sdk/commit/d4e5f7447d7172f519b97ff83b53f29c281710e7)), closes [#837](https://github.com/Agoric/agoric-sdk/issues/837) [#937](https://github.com/Agoric/agoric-sdk/issues/937) [#837](https://github.com/Agoric/agoric-sdk/issues/837) [#35](https://github.com/Agoric/agoric-sdk/issues/35)
* update tests to account for kernel tracking crank number ([700802d](https://github.com/Agoric/agoric-sdk/commit/700802d39a14c020a3514f3a3a22840f9d97a0bf))
* use harden ([453552b](https://github.com/Agoric/agoric-sdk/commit/453552b85839b125e516207750a8df87c34e4d41))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* add crank number to kernel state ([75e5d53](https://github.com/Agoric/agoric-sdk/commit/75e5d53d36862e630b3ee8e9628d2237493eb8ae))
* add Presence, getInterfaceOf, deepCopyData to marshal ([aac1899](https://github.com/Agoric/agoric-sdk/commit/aac1899b6cefc4241af04911a92ffc50fbac3429))
* add the network vat to ag-solo ([d88062c](https://github.com/Agoric/agoric-sdk/commit/d88062c9d35a10afaab82728123ca3d71b7d5189))
* allow pure handlers by passing the handler back in ([acf4bcc](https://github.com/Agoric/agoric-sdk/commit/acf4bcc585bbd03986080331830f34413ea7486d))
* begin getting working with loopback peer ([7729e86](https://github.com/Agoric/agoric-sdk/commit/7729e869793196cbc2f937260c0a320665056784))
* end-to-end dIBC across chains ([151ff3f](https://github.com/Agoric/agoric-sdk/commit/151ff3f9e0c92972aa7a21a6f55c1898db85b820))
* finish network router and multiaddr implementation ([dc74469](https://github.com/Agoric/agoric-sdk/commit/dc74469462b8fdc0f1fdc47dc4a9922a891902bd))
* first pass at channel API ([f45f04e](https://github.com/Agoric/agoric-sdk/commit/f45f04e88f8dc236ca509529dd7d45265449715e))
* get 'ibc/*/ordered/echo' handler working ([2795c21](https://github.com/Agoric/agoric-sdk/commit/2795c214cae8ac44eb5d19eb1b1aa0c066a22ecd))
* implement channel host handler ([4e68f44](https://github.com/Agoric/agoric-sdk/commit/4e68f441b46d70dee481387ab96e88f1e0b69bfa))
* implement the "sendPacket" transaction ([063c5b5](https://github.com/Agoric/agoric-sdk/commit/063c5b5c266187bc327dde568090dabf2bbfde8d))
* implement the network vat ([0fcd783](https://github.com/Agoric/agoric-sdk/commit/0fcd783576ecfab5430d3d905a53f22b3e01e95f))
* Improved console log diagnostics ([465329d](https://github.com/Agoric/agoric-sdk/commit/465329d1d7f740e82fa46da24be370e2081fcb33))
* introduce vats/ibc.js handler ([cb511e7](https://github.com/Agoric/agoric-sdk/commit/cb511e74e797bedbcce1aac4193780ae7abc8cfc))
* swingset: add 'bridge' device ([4b07cdd](https://github.com/Agoric/agoric-sdk/commit/4b07cddf5db86b3ee886b0aeb1a4932e664bdc39)), closes [#860](https://github.com/Agoric/agoric-sdk/issues/860)
* swingset: add networking.md ([74b53d4](https://github.com/Agoric/agoric-sdk/commit/74b53d420e9bc84d3b5e11555283e659556ea4b0))
* Treat state resulting from kernel initialization as if it resulted from a crank ([4763c02](https://github.com/Agoric/agoric-sdk/commit/4763c024c0fcae4471f525b385eb71548344d9df))





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.2-alpha.0...@agoric/swingset-vat@0.4.2) (2020-04-13)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.4.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.1...@agoric/swingset-vat@0.4.2-alpha.0) (2020-04-12)


### Bug Fixes

* liveslots use the returned promise rather than our own ([3135d9a](https://github.com/Agoric/agoric-sdk/commit/3135d9a14c0b9e773419c6882ad00fb285b27303))
* tweak log levels ([b0b1649](https://github.com/Agoric/agoric-sdk/commit/b0b1649423f7b950904604ba997ddb25e413fe08))





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.1-alpha.0...@agoric/swingset-vat@0.4.1) (2020-04-02)


### Bug Fixes

* make unhandledRejections log louder ([313adf0](https://github.com/Agoric/agoric-sdk/commit/313adf0b30ef2e6069573e1bb683bbb01411b175))





## [0.4.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.0...@agoric/swingset-vat@0.4.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-vat





# 0.4.0 (2020-03-26)


### Bug Fixes

* allow vats under SwingSet to unwrap their promises ([f2be5c7](https://github.com/Agoric/SwingSet/commit/f2be5c7806de93388e2641962539218313489fad))
* anachrophobia should crash hard ([42deaaf](https://github.com/Agoric/SwingSet/commit/42deaafc7082d42f5114134744e5fdd01cc93ad7)), closes [#68](https://github.com/Agoric/SwingSet/issues/68)
* first draft use collection equality ([6acbde7](https://github.com/Agoric/SwingSet/commit/6acbde71ec82101ec8da9eaafc729bab1fdd6df9))
* improve command device support ([c70b8a1](https://github.com/Agoric/SwingSet/commit/c70b8a10b04c5554b1a952daa584216227858bc5))
* input queuing, and use the block manager for fake-chain ([c1282c9](https://github.com/Agoric/SwingSet/commit/c1282c9e644fbea742846f96a80a06afe64664ba))
* let the caller handle dispatch rejections ([8a9761d](https://github.com/Agoric/SwingSet/commit/8a9761dcb49787a03bc302a1138a4e86a80ee360))
* make code clearer ([efc6b4a](https://github.com/Agoric/SwingSet/commit/efc6b4a369cc23813788f5626c61ec412e4e3f6a))
* make default log level for ag-chain-cosmos more compatible ([258e4c9](https://github.com/Agoric/SwingSet/commit/258e4c94746888f0392da19335cf7abc804c3b3a))
* remove 'Nat' from the set that SwingSet provides to kernel/vat code ([b4798d9](https://github.com/Agoric/SwingSet/commit/b4798d9e323c4cc16beca8c7f2547bce59334ae4))
* remove nondeterminism from ag-solo replay ([2855b34](https://github.com/Agoric/SwingSet/commit/2855b34158b71e7ffe0acd7680d2b3c218a5f0ca))
* secure the console and nestedEvaluate endowments ([ed13e80](https://github.com/Agoric/SwingSet/commit/ed13e8008628ee95cb1a5ee5cc5b8e9dd4640a32))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/SwingSet/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **solo:** get repl working again ([a42cfec](https://github.com/Agoric/SwingSet/commit/a42cfec9c8c087c77ec6e09d5a24edfe0d215c02))
* **swingset:** controller: enforce withSES==true ([e4d9b04](https://github.com/Agoric/SwingSet/commit/e4d9b04847bc5cc913f67fa308ff223779a10286))
* **swingset:** disable all non-SES tests ([b481008](https://github.com/Agoric/SwingSet/commit/b48100890d881e2678d4842993c6dcc067043eba))
* stringify an inboundHandler Error better ([6f80429](https://github.com/Agoric/SwingSet/commit/6f804291f7a348cef40899963b15a6274005a7f6))
* symbols no longer passable ([7290a90](https://github.com/Agoric/SwingSet/commit/7290a90444f70d2a9a2f5c1e2782d18bea00039d))
* **metering:** refactor names and implementation ([f1410f9](https://github.com/Agoric/SwingSet/commit/f1410f91fbee61903e82a81368675eef4fa0b836))
* **SwingSet:** ensure the registerEndOfCrank doesn't allow sandbox escape ([053c56e](https://github.com/Agoric/SwingSet/commit/053c56e19e5a4ff4eba5a1b7550ccac7e6dab5d7))
* **SwingSet:** passing all tests ([341718b](https://github.com/Agoric/SwingSet/commit/341718be335e16b58aa5e648b51a731ea065c1d6))
* **SwingSet:** remove Nat from nested evaluation contexts too ([69088d1](https://github.com/Agoric/SwingSet/commit/69088d1c225a8234b2f39a0490309615b5d0a047))
* **SwingSet:** remove redundant ${e} ${e.message} ([9251375](https://github.com/Agoric/SwingSet/commit/92513753bb8ec8b3dd28318bb26c7c7a58df2ba7))
* **timer:** don't enforce advancement, just prevent moving backwards ([7a0a509](https://github.com/Agoric/SwingSet/commit/7a0a50916ee98b4aad1288b34e4b1cda9b456437)), closes [#328](https://github.com/Agoric/SwingSet/issues/328)


### Features

* use anylogger to allow flexible message dispatch ([be8abc8](https://github.com/Agoric/SwingSet/commit/be8abc8fb8bb684273b13a1732a2bf509a962253))
* **metering:** allow the metering vat to register refill functions ([ce077a3](https://github.com/Agoric/SwingSet/commit/ce077a38aec75a01621ea6a115e919ae607e3aeb))
* **nestedEvaluate:** support new moduleFormat ([deb8ee7](https://github.com/Agoric/SwingSet/commit/deb8ee73437cb86ef98c160239c931305fb370ad))
* **spawner:** implement basic metering ([8bd495c](https://github.com/Agoric/SwingSet/commit/8bd495ce64ab20a4f7e78999846afe1f9bce96a4))
* **SwingSet:** pass all tests with metering installed ([d2dbd2c](https://github.com/Agoric/SwingSet/commit/d2dbd2c17db613faa18ccfa5903fa0160f90b35e))
