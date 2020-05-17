# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/sdk@2.4.0...@agoric/sdk@2.5.0) (2020-05-17)


### Bug Fixes

* bump dependency on newer cosmos-sdk ([d114c5e](https://github.com/Agoric/agoric-sdk/commit/d114c5e53be4056df89fd7a15bbd80b3a51fe4c1))
* don't bypass the block queue when running simulateBlock ([444067d](https://github.com/Agoric/agoric-sdk/commit/444067d24f2aee15eece92a0b1a4888b9fb9e419))
* don't stall extra turns while resolving to local objects ([04740d6](https://github.com/Agoric/agoric-sdk/commit/04740d6e1c2279f8ae1ab17ecc83bd6f772034a7))
* fix double invoke bug ([#1117](https://github.com/Agoric/agoric-sdk/issues/1117)) ([b8d462e](https://github.com/Agoric/agoric-sdk/commit/b8d462e56aa3f1080eb7617dd715a3ecbd2c9ae3))
* fix typedef for makeInstance (was erroring incorrectly) and give better error message for an invalid installationHandle ([#1109](https://github.com/Agoric/agoric-sdk/issues/1109)) ([4b352fc](https://github.com/Agoric/agoric-sdk/commit/4b352fc7f399a479d82181158d4d61e63790b31f))
* fix Zoe bug in which offer safety can be violated ([#1115](https://github.com/Agoric/agoric-sdk/issues/1115)) ([39d6ae2](https://github.com/Agoric/agoric-sdk/commit/39d6ae26dd1aaec737ae0f9a47af5c396868c188)), closes [#1076](https://github.com/Agoric/agoric-sdk/issues/1076)
* **transform-eventual-send:** split out rewriter.js to fix cycle ([8a54d36](https://github.com/Agoric/agoric-sdk/commit/8a54d36f6de8cee2ea87d6c75ea1eb013f40e766))
* make output from bundleSource correspond to source map lines ([c1ddd4a](https://github.com/Agoric/agoric-sdk/commit/c1ddd4a0a27de9561b3bd827213562d9741e61a8))
* remove many build steps ([6c7d3bb](https://github.com/Agoric/agoric-sdk/commit/6c7d3bb0c70277c22f8eda40525d7240141a5434))
* temporary fix to support displaying NFT extents which are arrays of objects ([#1094](https://github.com/Agoric/agoric-sdk/issues/1094)) ([07e554b](https://github.com/Agoric/agoric-sdk/commit/07e554b9eccf930ba850868b9ad604a1539d1c8f))


### Features

* marshal based on user's petnames ([#1092](https://github.com/Agoric/agoric-sdk/issues/1092)) ([5e1945c](https://github.com/Agoric/agoric-sdk/commit/5e1945c99d405c2dbf1a6c980591c09d8a952e8a))
* **transform-eventual-send:** expose bare transform function too ([0bb35eb](https://github.com/Agoric/agoric-sdk/commit/0bb35eb11fd9acc4e90ec987f83f246e09cdcab5))
* provide scaffolding for testing scenario3's home objects ([84752e2](https://github.com/Agoric/agoric-sdk/commit/84752e230f22d8cc254413e3827a24140318dfcb))





# [2.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/sdk@2.3.0...@agoric/sdk@2.4.0) (2020-05-10)


### Bug Fixes

* always send non-empty acknowledgements ([5e22a4a](https://github.com/Agoric/agoric-sdk/commit/5e22a4a78db9004351f53d6cb5bfdd29f9ee25b6))
* be lazy in choosing which handler to use ([904b610](https://github.com/Agoric/agoric-sdk/commit/904b610685a50ba32dc0712e62f4c902f61e437a))
* be sure to propagate handler failures ([2b931fc](https://github.com/Agoric/agoric-sdk/commit/2b931fcb60afcb24fd7c331eadd12dbfc4592e85))
* bigdipper settings changes ([facb79d](https://github.com/Agoric/agoric-sdk/commit/facb79d89a470371c67e89cb08656ed5cfdc5348))
* fail hard if there is no $BOOT_ADDRESS ([eeb2592](https://github.com/Agoric/agoric-sdk/commit/eeb25920557974bccc05978ab81966e8cc2a460e))
* filter proposal give and want by sparseKeywords in zcf.reallocate ([#1076](https://github.com/Agoric/agoric-sdk/issues/1076)) ([fb36a40](https://github.com/Agoric/agoric-sdk/commit/fb36a406e628765376797ab3663272402d3584b3))
* fix typo in idToComplete ([#1050](https://github.com/Agoric/agoric-sdk/issues/1050)) ([605e00e](https://github.com/Agoric/agoric-sdk/commit/605e00efd089218d6e2b9bacca352c0e933a8bd8))
* full traversal of sendPacket from end-to-end ([5c76981](https://github.com/Agoric/agoric-sdk/commit/5c76981aa02bf1cd1dcec174bff4a7f95638d500))
* index_all_keys for IBC ([f513bda](https://github.com/Agoric/agoric-sdk/commit/f513bdabd413b36a8bcab28b598eed4fef7da561))
* rewrite liveslots use of HandledPromise, remove deliver() stall ([42c2193](https://github.com/Agoric/agoric-sdk/commit/42c2193ce62f527eb2dfa1b5bed4f8b32f2d452d))


### Features

* ag-nchainz start-relayer now starts a single-channel relay ([6946dfb](https://github.com/Agoric/agoric-sdk/commit/6946dfbcae3023675ecffcc22fca2d866a745134))
* Optionally suppress wallet ([ceae9e6](https://github.com/Agoric/agoric-sdk/commit/ceae9e65cf4ece932d1f565c74afeec06c9074cb))





# [2.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/sdk@2.2.0...@agoric/sdk@2.3.0) (2020-05-04)


### Bug Fixes

* crisper rejection of closed and revoked ports/connections ([589702b](https://github.com/Agoric/agoric-sdk/commit/589702bb049eed808029546fd0f0eb0b1a19864b))
* decrease the need for sendPacket delay (almost fixed) ([9f65899](https://github.com/Agoric/agoric-sdk/commit/9f658991eb38009ada8d1a6127ad1d6f323d326e))
* fix "delegates" conditional syntax ([0a774a5](https://github.com/Agoric/agoric-sdk/commit/0a774a57be0697a8351f1a8523710f04e5368e82))
* ibcports->ibcport ([efb9d95](https://github.com/Agoric/agoric-sdk/commit/efb9d95c8fc5b69e76e9dc52236ebea2f98ee50c))
* introduce sleep to help mitigate a relayer race condition ([c0014d3](https://github.com/Agoric/agoric-sdk/commit/c0014d3108f28c01d507da1c7553295a3fde6b06))
* lots and lots of improvements ([8f1c312](https://github.com/Agoric/agoric-sdk/commit/8f1c3128bbb4c3baf7f15b9ca632fc902acd238f))
* minor cleanups ([8b63024](https://github.com/Agoric/agoric-sdk/commit/8b63024a0c749c3c61c3daee3695f4546d8079ff))
* missed a change in refactoring ([567f713](https://github.com/Agoric/agoric-sdk/commit/567f71318d5c3bdbf7a6ed620610790dd7cd3c22))
* more dIBC inbound work ([6653937](https://github.com/Agoric/agoric-sdk/commit/665393779540c580d57f798aa01c62855e7b5278))
* propagate flushChainSend argument from fake-chain to launch ([69ee801](https://github.com/Agoric/agoric-sdk/commit/69ee8019eeda3f6ede4737d90e2abbbff8d5203a))
* propagate Go errors all the way to the caller ([ea5ba38](https://github.com/Agoric/agoric-sdk/commit/ea5ba381e4e510bb9c9053bfb681e778f782a801))
* proper inbound IBC listening ([3988235](https://github.com/Agoric/agoric-sdk/commit/3988235312806711c1837f80788ddc42ae7713dd))
* reject all sends when the connection is closed ([61b0975](https://github.com/Agoric/agoric-sdk/commit/61b09750c6c89f0097addd9ee068751bc4a55e56))
* remove hack to delay packets with a timer; the relayer wins! ([a16a444](https://github.com/Agoric/agoric-sdk/commit/a16a444fd1f801b578cc0251da882898b1071355))
* upgrade Cosmos SDK to fix x/capability nondeterminism ([1870d5e](https://github.com/Agoric/agoric-sdk/commit/1870d5e95966aaa63c6a0078848a8af255373d5f))
* use the downcall's partial Packet as arguments where possible ([3befb25](https://github.com/Agoric/agoric-sdk/commit/3befb25363fb7f7867e67d6d5ce2c1f807a3c9a7))


### Features

* end-to-end dIBC across chains ([151ff3f](https://github.com/Agoric/agoric-sdk/commit/151ff3f9e0c92972aa7a21a6f55c1898db85b820))
* implement `console` endowment for the REPL ([4aaf56d](https://github.com/Agoric/agoric-sdk/commit/4aaf56d883faf661d54862bd46357a8b89ad668f))
* suspend an outbound connection until the relayer picks it up ([ee22926](https://github.com/Agoric/agoric-sdk/commit/ee22926e52c3b4d17df7fa760e017d02f03f1a8f))





# [2.1.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/sdk@2.1.0-alpha.0...@agoric/sdk@2.1.0) (2020-04-13)

**Note:** Version bump only for package @agoric/sdk





# [2.1.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/sdk@2.0.1...@agoric/sdk@2.1.0-alpha.0) (2020-04-12)


### Bug Fixes

* better detection of already-listening ports ([6194c31](https://github.com/Agoric/agoric-sdk/commit/6194c31a9c7405f017666ac6de29b054b3e87c9d))
* change the account prefix to "agoric" and app name to Agoric ([0c14de9](https://github.com/Agoric/agoric-sdk/commit/0c14de900c008afb8a09eeeddaff6547be7096d2))
* cosmic-swingset should use disk-backed storage ([da0613a](https://github.com/Agoric/agoric-sdk/commit/da0613a58fa9711d64584ee1cd7886309cff52fd)), closes [#899](https://github.com/Agoric/agoric-sdk/issues/899)
* increase level of contract console.log to console.info ([00156f2](https://github.com/Agoric/agoric-sdk/commit/00156f235abb1b87db1c5ab0bd5155c2f3615382))
* liveslots use the returned promise rather than our own ([3135d9a](https://github.com/Agoric/agoric-sdk/commit/3135d9a14c0b9e773419c6882ad00fb285b27303))
* reinstate carrying forward public keys ([504a8ce](https://github.com/Agoric/agoric-sdk/commit/504a8ce6a004d08c9436ed88a39e3c63ecb5202b))
* revive the ability of a zoe client to get access to the code. ([1ad9265](https://github.com/Agoric/agoric-sdk/commit/1ad926519cc6ca14aadc2a328d89f0d400a8bc95)), closes [#877](https://github.com/Agoric/agoric-sdk/issues/877)
* rewrite HTML comments and import expressions for SES's sake ([1a970f6](https://github.com/Agoric/agoric-sdk/commit/1a970f65b67e047711e53949a286f1587b9a2e75))
* shorten HandledPromises to propagate handlers ([2ed50d2](https://github.com/Agoric/agoric-sdk/commit/2ed50d24c1b80959748bcaf0d04f1c4cd25f4242))
* shut up eslint ([fcc1ff3](https://github.com/Agoric/agoric-sdk/commit/fcc1ff33ffc26dde787c36413e094365e1d09c03))
* tweak log levels ([b0b1649](https://github.com/Agoric/agoric-sdk/commit/b0b1649423f7b950904604ba997ddb25e413fe08))
* **zoe:** ensure offers have the same instance handle as the contract calling the contract facet method ([#910](https://github.com/Agoric/agoric-sdk/issues/910)) ([0ffe65f](https://github.com/Agoric/agoric-sdk/commit/0ffe65faa5baccb114d0d91540cd9578606d7646))
* update checkIfProposal and rejectIfNotProposal ([7cdf09d](https://github.com/Agoric/agoric-sdk/commit/7cdf09dec9740a167c4c1d5770e82774961a5ae0))
* **zoe:** improve assertSubset error message ([#873](https://github.com/Agoric/agoric-sdk/issues/873)) ([4c6f11f](https://github.com/Agoric/agoric-sdk/commit/4c6f11f1931342fd09b3170183e3df77bed0d678))


### Features

* add the returnedP as the last argument to the handler ([1f83d99](https://github.com/Agoric/agoric-sdk/commit/1f83d994f48b659f3c49c4b5eb2b50ea7bb7b7a3))
* allow sparse keywords ([#812](https://github.com/Agoric/agoric-sdk/issues/812)) ([dcc9ba3](https://github.com/Agoric/agoric-sdk/commit/dcc9ba3413d096c78df9f8b184991c3bfd83ace3)), closes [#391](https://github.com/Agoric/agoric-sdk/issues/391)
* Be smarter about where database files are located. ([2eb1469](https://github.com/Agoric/agoric-sdk/commit/2eb14694a108899f1bafb725e3e0b4a34150a07f))
* Check that makeInstance() returns an actual invite ([546d2ef](https://github.com/Agoric/agoric-sdk/commit/546d2ef69ca8e2c2c3ad17c0b78083b281cb3a9a)), closes [#820](https://github.com/Agoric/agoric-sdk/issues/820)
* introduce a wrapper around ag-solo to start in inspect mode ([93e4887](https://github.com/Agoric/agoric-sdk/commit/93e488790da490d997c7d707b1340fc7be5b33b7))
* new tool -- kernel state dump utility ([f55110e](https://github.com/Agoric/agoric-sdk/commit/f55110e0e4f5963faf1ff86895cd3d0120bb7eca))
* retry the CapTP Websocket if it failed ([be4bd4e](https://github.com/Agoric/agoric-sdk/commit/be4bd4e39b0e86279cd2e92380b6ee19270abd5e))
* use SETUP_HOME/cosmos-delegates.txt and increase defaults ([5e87ae1](https://github.com/Agoric/agoric-sdk/commit/5e87ae1c501adf5b35371c30dc999bfcea8c75e6))





## [2.0.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/sdk@2.0.0...@agoric/sdk@2.0.1) (2020-04-03)


### Bug Fixes

* make provisioning server work again ([c7cf3b3](https://github.com/Agoric/agoric-sdk/commit/c7cf3b3e0d5e0966ce87639ca1aa36546f365e38))





# 2.0.0 (2020-04-02)


### Bug Fixes

* add `single-node` subcommand on the Docker entrypoint ([210edb6](https://github.com/Agoric/agoric-sdk/commit/210edb683280791b0e74831860c7e93176dadbed))
* convert some tests from try/catch/finally to t.plan() ([df8e686](https://github.com/Agoric/agoric-sdk/commit/df8e686bb2ea3a95e67cff930b9bfe46850f017d))
* have a generic IBCChannelHandler that takes ChannelTuples ([3bff564](https://github.com/Agoric/agoric-sdk/commit/3bff564a4ffa6f43e4496871b628ea1bfaa4c568))
* make agoric start work without SDK ([8e5b6d6](https://github.com/Agoric/agoric-sdk/commit/8e5b6d6578dfb4cf059fd6f52d1a3c983dd178ba))
* make unhandledRejections log louder ([313adf0](https://github.com/Agoric/agoric-sdk/commit/313adf0b30ef2e6069573e1bb683bbb01411b175))
* prevent deadlock in the input queue for delivered commands ([ee0e488](https://github.com/Agoric/agoric-sdk/commit/ee0e4881dc2dd17fea8b4efea6e149bd86daab22))
* properly install outside of SDK ([1087400](https://github.com/Agoric/agoric-sdk/commit/10874009cf849e408dc986d02d2c4831f6712a1a))
* properly use EncodedLen ([0633825](https://github.com/Agoric/agoric-sdk/commit/063382581ba472ec5adb0eb5760f501148158010))
* revert Zoe change ([#775](https://github.com/Agoric/agoric-sdk/issues/775)) ([9212818](https://github.com/Agoric/agoric-sdk/commit/9212818d71e0906a7be343eda6acd37e634008be))
* run "yarn install" in the ui directory ([62bfe8d](https://github.com/Agoric/agoric-sdk/commit/62bfe8d4e634b35d7f830f6aef1b3f3a7134cc06))
* stringify queued objects when sending over WebSocket ([6c45374](https://github.com/Agoric/agoric-sdk/commit/6c453742c773f79dc956a56515a3701152341bc7))
* use commander for better help output ([d9e8349](https://github.com/Agoric/agoric-sdk/commit/d9e83493a4a6a1e2312bc3c300d83f604c70b755))
* use the PacketI interface where possible ([48c3bf5](https://github.com/Agoric/agoric-sdk/commit/48c3bf5e80b6fd8d4fec3e73a4a2225eb1ca5ae8))
* wait for payments at opportune moments ([53f359d](https://github.com/Agoric/agoric-sdk/commit/53f359d56c49ef62a90e1e834b359de8ca5dfa4f))


### Features

* add E.when(x, onfulfilled, onrejected) as a convenience ([4415f67](https://github.com/Agoric/agoric-sdk/commit/4415f67651f7770fddea85272ee7a02b69b9e8aa))
* allow optional arguments to redeem ([e930944](https://github.com/Agoric/agoric-sdk/commit/e930944390cc85ce287a87c25005e76891fa92d1))
* collapse the dapp-template history ([1cb5798](https://github.com/Agoric/agoric-sdk/commit/1cb57989f64aa36a0859f81f5f8927cb928baff2))
* implement the Go side of dynamic IBC ([cf2d894](https://github.com/Agoric/agoric-sdk/commit/cf2d8945eecd8871898c127e9748ea7c5247628e))
* just ack IBC packets and close ([88257f8](https://github.com/Agoric/agoric-sdk/commit/88257f80574e3651cf88b50a2d513139dc7d497f))
* use Agoric version of cosmos-sdk for dynamic IBC ([b004f11](https://github.com/Agoric/agoric-sdk/commit/b004f11f7c50d508c6de9f51ad28a1b1fc266ae0))



## 0.4.2 (2020-03-25)


### Bug Fixes

* accomodate modified offer ids ([38d367d](https://github.com/Agoric/agoric-sdk/commit/38d367dedcba143524b4668573f11b757233401b))
* actually synchronise the inbound messages ([9568483](https://github.com/Agoric/agoric-sdk/commit/95684834643321dcceb70675f450efe42464df7c))
* add missing files and dependencies ([2dc3e07](https://github.com/Agoric/agoric-sdk/commit/2dc3e072103aa68517c0ca31b15e1bf6d4bfc239))
* allow disabling of logging by setting DEBUG='' ([131c1c6](https://github.com/Agoric/agoric-sdk/commit/131c1c64f646f2fa3adece698d1da240dc969f03))
* allow vats under SwingSet to unwrap their promises ([f2be5c7](https://github.com/Agoric/agoric-sdk/commit/f2be5c7806de93388e2641962539218313489fad))
* freshen the simple exchange dApp ([82f634f](https://github.com/Agoric/agoric-sdk/commit/82f634ff76fe1dd6a253a61a11b06dea71dd1c15)), closes [#646](https://github.com/Agoric/agoric-sdk/issues/646)
* getOfferDescriptions is now working ([b50690b](https://github.com/Agoric/agoric-sdk/commit/b50690be3294baff6165cb3a10b644f31bb29e15))
* hydrateHooks on the HTTP handler instead of addOffer ([b3e214d](https://github.com/Agoric/agoric-sdk/commit/b3e214d66a9e753da992d1e320350321c78e747a))
* improve command device support ([c70b8a1](https://github.com/Agoric/agoric-sdk/commit/c70b8a10b04c5554b1a952daa584216227858bc5))
* input queuing, and use the block manager for fake-chain ([c1282c9](https://github.com/Agoric/agoric-sdk/commit/c1282c9e644fbea742846f96a80a06afe64664ba))
* introduce and use Store.entries() ([b572d51](https://github.com/Agoric/agoric-sdk/commit/b572d51df45641da59bc013a0f2e45a694e56cbc))
* let the caller handle dispatch rejections ([8a9761d](https://github.com/Agoric/agoric-sdk/commit/8a9761dcb49787a03bc302a1138a4e86a80ee360))
* make default log level for ag-chain-cosmos more compatible ([258e4c9](https://github.com/Agoric/agoric-sdk/commit/258e4c94746888f0392da19335cf7abc804c3b3a))
* make REPL occupy less of screen when below wallet ([d4fc392](https://github.com/Agoric/agoric-sdk/commit/d4fc392f49bd515a70e2cc904f2fca08b0931584))
* make the changes needed to cancel pending offers ([b4caa9e](https://github.com/Agoric/agoric-sdk/commit/b4caa9ed26489ad39651b4717d09bd9f84557480))
* make the fake-chain better ([b4e5b02](https://github.com/Agoric/agoric-sdk/commit/b4e5b02ca8fc5b6df925391f3b0a2d6faecbdb73))
* prevent simulated blocks from reentering the kernel ([42f7abd](https://github.com/Agoric/agoric-sdk/commit/42f7abd4ec9a017bbca6d02c164c06272e328713)), closes [#763](https://github.com/Agoric/agoric-sdk/issues/763)
* propagate makeContract exceptions ([9a3cc18](https://github.com/Agoric/agoric-sdk/commit/9a3cc187b7ee75c446610cc3a101dfd0f557ea66))
* propagate more errors correctly ([0437c5f](https://github.com/Agoric/agoric-sdk/commit/0437c5f1510c05d49a4b5070919db77efefdbb09))
* proper sorting of wallet entries ([24627eb](https://github.com/Agoric/agoric-sdk/commit/24627eb5c271d75052370afa24ead851d001a126))
* properly kill off child processes on SIGHUP ([93b71cd](https://github.com/Agoric/agoric-sdk/commit/93b71cd6b894cbd37dab39b6946ed8e6d47ab2a6))
* reenable package.json substitutions ([10bece7](https://github.com/Agoric/agoric-sdk/commit/10bece74cdb9608f069d7f2b4c3534368ce2ea5d))
* regression in `agoric start --reset` ([206ecd0](https://github.com/Agoric/agoric-sdk/commit/206ecd088f1bc2bb33c15c3f8c134fe2d8b4f39e))
* reinstate console endowment needed for Zoe contract debugging ([851d1ec](https://github.com/Agoric/agoric-sdk/commit/851d1ec78bba30c70571f400c8525c654338c641))
* remove extra interleaved spaces from assert console.error ([c6af2e4](https://github.com/Agoric/agoric-sdk/commit/c6af2e4abfc28959f70518d7905076270cffcb34))
* remove nondeterminism from ag-solo replay ([2855b34](https://github.com/Agoric/agoric-sdk/commit/2855b34158b71e7ffe0acd7680d2b3c218a5f0ca))
* remove reference to ping ([a9a3f0f](https://github.com/Agoric/agoric-sdk/commit/a9a3f0fd68d9870333fd25c458d8eba151557c65))
* rename connection to channel ([f50a94b](https://github.com/Agoric/agoric-sdk/commit/f50a94b33029e7ebd67db9a1c812f1d2dc955aa9))
* revert usage of SIGHUP to SIGINT ([2948400](https://github.com/Agoric/agoric-sdk/commit/294840026ef81bd19407c91bb92b68e4b5e13198))
* secure the console and nestedEvaluate endowments ([ed13e80](https://github.com/Agoric/agoric-sdk/commit/ed13e8008628ee95cb1a5ee5cc5b8e9dd4640a32))
* ses-adapter/package.json: fix files ([3b77dff](https://github.com/Agoric/agoric-sdk/commit/3b77dff8ab8796b0487b9f99338fc202e039c016))
* silence the builtin modules warning in agoric-cli deploy ([9043516](https://github.com/Agoric/agoric-sdk/commit/904351655f8acedd5720e5f0cc3ace83b5cf6192))
* we now send 50agstake to each of the validators ([9a78552](https://github.com/Agoric/agoric-sdk/commit/9a78552606db91b7f678464b27261a391844916d))
* **swingset:** controller: enforce withSES==true ([e4d9b04](https://github.com/Agoric/agoric-sdk/commit/e4d9b04847bc5cc913f67fa308ff223779a10286))
* **swingset:** disable all non-SES tests ([b481008](https://github.com/Agoric/agoric-sdk/commit/b48100890d881e2678d4842993c6dcc067043eba))
* add END_BLOCK controller call ([b115b55](https://github.com/Agoric/agoric-sdk/commit/b115b559ef7636c7b4ed3f3878d347a2216a4947))
* add issuerRegKey to the purse output ([f7d90fa](https://github.com/Agoric/agoric-sdk/commit/f7d90fa884d74a1535d9f89dd839729a22170d16))
* anachrophobia should crash hard ([42deaaf](https://github.com/Agoric/agoric-sdk/commit/42deaafc7082d42f5114134744e5fdd01cc93ad7)), closes [#68](https://github.com/Agoric/agoric-sdk/issues/68)
* backport scripts/link-cli.js ([2974075](https://github.com/Agoric/agoric-sdk/commit/297407527f0750d238b68cc7f0066c0e0b93a6ba)), closes [#661](https://github.com/Agoric/agoric-sdk/issues/661)
* display in terms of issuers, not assays ([8a2a692](https://github.com/Agoric/agoric-sdk/commit/8a2a692b8758bed82074ed86988dd0deedce0c8a))
* don't double-withdraw from the first purse of an assay ([b37203e](https://github.com/Agoric/agoric-sdk/commit/b37203eded655169853bb1a3c7acdcdc8634ef15))
* first draft use collection equality ([6acbde7](https://github.com/Agoric/agoric-sdk/commit/6acbde71ec82101ec8da9eaafc729bab1fdd6df9))
* fix discrepencies revealed by the agoric-cli test ([422b019](https://github.com/Agoric/agoric-sdk/commit/422b01946481f549e15c8d36270146e5729855f7))
* generalise the wallet to arbitrary offers ([4b3ae29](https://github.com/Agoric/agoric-sdk/commit/4b3ae2974b2060e022fbe200b82e986d09cbc09a))
* make code clearer ([efc6b4a](https://github.com/Agoric/agoric-sdk/commit/efc6b4a369cc23813788f5626c61ec412e4e3f6a))
* panic on END_BLOCK error ([28b6d46](https://github.com/Agoric/agoric-sdk/commit/28b6d467ba3a40e752f75467c2381d1afa69a77e))
* polish the wallet and dApp UIs ([292291f](https://github.com/Agoric/agoric-sdk/commit/292291f234646cdb0685dbf63cf0a75a2491018c))
* remove 'Nat' from the set that SwingSet provides to kernel/vat code ([b4798d9](https://github.com/Agoric/agoric-sdk/commit/b4798d9e323c4cc16beca8c7f2547bce59334ae4))
* rename .agwallet and .agservers into _agstate ([a82d44f](https://github.com/Agoric/agoric-sdk/commit/a82d44fe370d32f8383e4558c7b03f3d13a2f163))
* run mkdir with recursive option to prevent exceptions ([a01fa04](https://github.com/Agoric/agoric-sdk/commit/a01fa04c2955e0f00f3bc29aa3862c2440a23c8e)), closes [#662](https://github.com/Agoric/agoric-sdk/issues/662)
* stringify an inboundHandler Error better ([6f80429](https://github.com/Agoric/agoric-sdk/commit/6f804291f7a348cef40899963b15a6274005a7f6))
* symbols no longer passable ([7290a90](https://github.com/Agoric/agoric-sdk/commit/7290a90444f70d2a9a2f5c1e2782d18bea00039d))
* unbreak the fake-chain ([d84ee30](https://github.com/Agoric/agoric-sdk/commit/d84ee30ad2991e0f1676627a23c3e6989d3b0728))
* use COMMIT_BLOCK action to sync state ([5a3c087](https://github.com/Agoric/agoric-sdk/commit/5a3c08705d8477fcc281134e8a3540079fcb1edd))
* **ag-cosmos-helper:** properly register /txs route ([17bae2d](https://github.com/Agoric/agoric-sdk/commit/17bae2d1546e14d1555b1e97b9359372ee124ba5))
* **ag-lcd:** tolerate cosmos/cosmos-sdk[#5592](https://github.com/Agoric/agoric-sdk/issues/5592) ([9eee270](https://github.com/Agoric/agoric-sdk/commit/9eee270beeeef415bad3a988c7ee890523f9d7e8))
* **ag-solo:** be more tolerant of missing wallet ([94c2a3e](https://github.com/Agoric/agoric-sdk/commit/94c2a3e38d618202c125f784814858bf06e4d191))
* **ag-solo:** don't require a git checkout to init ([b8c4474](https://github.com/Agoric/agoric-sdk/commit/b8c44748da0e0b9df468c518c8d37c0aa75013d6)), closes [#570](https://github.com/Agoric/agoric-sdk/issues/570) [#562](https://github.com/Agoric/agoric-sdk/issues/562)
* **ag-solo:** reenable the ag-solo bundle command ([6126774](https://github.com/Agoric/agoric-sdk/commit/6126774fd3f102cf575a430dfddb3a0c6adcf0f5)), closes [#606](https://github.com/Agoric/agoric-sdk/issues/606)
* **ag-solo-xs:** use noflake to help mitigate CI flakes ([4ee9889](https://github.com/Agoric/agoric-sdk/commit/4ee988977aa3c2db386c8477c6cfb2565ac5ad2b)), closes [#471](https://github.com/Agoric/agoric-sdk/issues/471)
* **agoric-cli:** changes to make `agoric --sdk` basically work again ([#459](https://github.com/Agoric/agoric-sdk/issues/459)) ([1dc046a](https://github.com/Agoric/agoric-sdk/commit/1dc046a02d5e616d33f48954e307692b43008442))
* **agoric-cli:** install the SDK symlink if requested ([f7fd68f](https://github.com/Agoric/agoric-sdk/commit/f7fd68f8aa301a14a110f403c1970d0bd1c1a51f))
* **ansible:** remove state that needs regeneration ([110dcb8](https://github.com/Agoric/agoric-sdk/commit/110dcb8625eb9d4d918f02c69e92451bcc77296b))
* **bundle:** use the same HandledPromise ([e668d3c](https://github.com/Agoric/agoric-sdk/commit/e668d3c9106ef6c47c66319afb8d954094b128eb)), closes [#606](https://github.com/Agoric/agoric-sdk/issues/606)
* **bundle-source:** regain default 'getExport' ([f234d49](https://github.com/Agoric/agoric-sdk/commit/f234d49be14d50d13249d79f7302aa8e594e23d2))
* **chain:** properly commit state ([7703aa7](https://github.com/Agoric/agoric-sdk/commit/7703aa753769d89dc1b2c7a899cfcf37c2f3626f))
* **chain:** state is being stored correctly again ([fe0b33d](https://github.com/Agoric/agoric-sdk/commit/fe0b33d2d33b4989f63d1e7030de61b5e886e69f))
* **cli:** improve install, template, fake-chain ([0890171](https://github.com/Agoric/agoric-sdk/commit/08901713bd3db18b52ed1793efca21b459e3713e))
* **configurableGlobals:** use to wrap all builtins under SES ([53c4549](https://github.com/Agoric/agoric-sdk/commit/53c4549e3c9ba9de30a0fd2077c3f352339493e9))
* **deployment:** update deployment steps ([7527eb0](https://github.com/Agoric/agoric-sdk/commit/7527eb01a3fd5fd4eb4db6f7e9452ccacfe39a74))
* **end-to-end:** metering works for some malicious code ([905061c](https://github.com/Agoric/agoric-sdk/commit/905061cbb7d7bc1c3eda4e434cbc72812cb73d2c))
* **evaluator:** quiescence works ([15adc38](https://github.com/Agoric/agoric-sdk/commit/15adc38228fe14dfac4a52a647b47d3013818aec))
* **github:** disable pessimal cache temporarily ([4cae336](https://github.com/Agoric/agoric-sdk/commit/4cae3360d645a1ebe8dd707fa07e75b6a446e9c3))
* **github:** hash only minimal cache key files ([f79f976](https://github.com/Agoric/agoric-sdk/commit/f79f976ecb442d3967dad92cc59d664997fd50b6)), closes [actions/runner#319](https://github.com/actions/runner/issues/319)
* **github:** update build process ([d90c1c6](https://github.com/Agoric/agoric-sdk/commit/d90c1c6eac219ca8c2c06aab46be246994b668eb))
* **go:** use agoric-labs/tendermint subscription-keep-id ([10b2cd2](https://github.com/Agoric/agoric-sdk/commit/10b2cd26191b1d8982f44a68bbe4f480be3772de))
* **init:** handle symbolic links and ignored files properly ([2d6b876](https://github.com/Agoric/agoric-sdk/commit/2d6b87604d6a1bc97028a89f1f3b8c59a7f3a991))
* **lockdown:** Begin working toward lockdown-style SES API ([3e63758](https://github.com/Agoric/agoric-sdk/commit/3e63758fbd0e197cb012d96dbd7d25a2bdd162e3))
* **Makefile:** better convention for installing ag-chain-cosmos ([b27426a](https://github.com/Agoric/agoric-sdk/commit/b27426a0b74e9c21482172b71cc30fc36ebf29f5))
* **Makefile:** install ag-chain-cosmos in $GOPATH/bin/ ([d4af74f](https://github.com/Agoric/agoric-sdk/commit/d4af74fbc090383f9e2bdcd564a72f3a6433e164))
* **Makefile:** set up the GOPATH environment ([ab72ca5](https://github.com/Agoric/agoric-sdk/commit/ab72ca562e0c5f2f6051a1c3eabebd0e680f3808))
* **makePromise:** support HandledPromise.unwrap(p) ([fb98636](https://github.com/Agoric/agoric-sdk/commit/fb98636864583e222f67087cbbe487bcfd74a772))
* **metering:** bump default combined meter for autoswap compatibility ([ac10627](https://github.com/Agoric/agoric-sdk/commit/ac10627a3524bdd6d2719026497fd37c8d00d25b))
* **metering:** get all tests working again ([f2a3206](https://github.com/Agoric/agoric-sdk/commit/f2a3206ad3c4ba98b225380a289bf49a12857a00))
* **metering:** more cleanups and documentation ([78ced24](https://github.com/Agoric/agoric-sdk/commit/78ced244d3028eadf4689bf44b7407f524ae509f))
* **metering:** properly reset for each crank ([ba191fe](https://github.com/Agoric/agoric-sdk/commit/ba191fe3435905e3d2ea5ab016571d1943d84bec))
* **metering:** properly transform try/catch/finally ([6fd28ae](https://github.com/Agoric/agoric-sdk/commit/6fd28ae7e56e052a9405de98d232a859de05653b))
* **metering:** refactor names and implementation ([f1410f9](https://github.com/Agoric/agoric-sdk/commit/f1410f91fbee61903e82a81368675eef4fa0b836))
* **provisioner:** allow for mount points as well ([7350220](https://github.com/Agoric/agoric-sdk/commit/7350220dfab2612ad7f3858988220cb307b92726))
* **provisioning-server:** remove debug prints ([f5b0e14](https://github.com/Agoric/agoric-sdk/commit/f5b0e14a96c77fd1bb40fbbf42e4f253b551d0a8))
* **pserver:** clarify StackedResource ([1251669](https://github.com/Agoric/agoric-sdk/commit/125166946d9eb985f6db2d797accbe37b6a90c22))
* **pserver:** new helper arguments and returns ([d40f2ac](https://github.com/Agoric/agoric-sdk/commit/d40f2ac452936ae8996f0e199c2b3f33ebc913c6))
* **solo:** get repl working again ([a42cfec](https://github.com/Agoric/agoric-sdk/commit/a42cfec9c8c087c77ec6e09d5a24edfe0d215c02))
* **spawner:** fail-stop meter exhaustion ([e390c35](https://github.com/Agoric/agoric-sdk/commit/e390c35c67aba674c22e03ede30e01c4da46ad3b))
* **spawner:** get tests to pass by fighting the esm package ([6993c1b](https://github.com/Agoric/agoric-sdk/commit/6993c1b9dc06d63d24c7a30656368131cff631a1))
* **spawner:** move makeCollect into a separate file ([31c2e28](https://github.com/Agoric/agoric-sdk/commit/31c2e2813ee4c6ff910b482c2d262241e5f941fc))
* **start:** parse `--pull` properly ([a5ac2c9](https://github.com/Agoric/agoric-sdk/commit/a5ac2c956c47e94ef79be53b683d48e8146a7b05))
* **SwingSet:** ensure the registerEndOfCrank doesn't allow sandbox escape ([053c56e](https://github.com/Agoric/agoric-sdk/commit/053c56e19e5a4ff4eba5a1b7550ccac7e6dab5d7))
* **SwingSet:** remove Nat from nested evaluation contexts too ([69088d1](https://github.com/Agoric/agoric-sdk/commit/69088d1c225a8234b2f39a0490309615b5d0a047))
* use latest @agoric/tendermint ([346b582](https://github.com/Agoric/agoric-sdk/commit/346b58291360b586e02278b14a7860715f0a06e8))
* **SwingSet:** remove redundant ${e} ${e.message} ([9251375](https://github.com/Agoric/agoric-sdk/commit/92513753bb8ec8b3dd28318bb26c7c7a58df2ba7))
* **tame-metering:** get working under SES 1.0 ([8246884](https://github.com/Agoric/agoric-sdk/commit/82468844e4d5ac8a6b1ad46c1009cf0719e701ea))
* **tame-metering:** new implementation of isConstructor ([362456d](https://github.com/Agoric/agoric-sdk/commit/362456d9e6dc0eb0d139eb1c777c43a877db0cf9))
* **tame-metering:** remove .prototype via bind if necessary ([a77c7e3](https://github.com/Agoric/agoric-sdk/commit/a77c7e37e76c366ec5f6d039afc8e4872b533226))
* **test-make:** run the default Makefile target ([aa7d960](https://github.com/Agoric/agoric-sdk/commit/aa7d96039d6e0ca00d24a01756569e1780b375ea))
* **transform-metering:** only enable meters; the host has to disable ([d1b8e84](https://github.com/Agoric/agoric-sdk/commit/d1b8e84361b7ebebb363373dd730f10383e46ef8))
* rename ustake -> uagstake ([ac89559](https://github.com/Agoric/agoric-sdk/commit/ac895597e57a118948d686a0f60ebf8aed18d64e))
* try again with tape-xs ag03 ([ad24880](https://github.com/Agoric/agoric-sdk/commit/ad24880488a3114223fe8c6bfcfc8659bebc117e))
* wrap globals instead of using a Proxy ([35b2d5c](https://github.com/Agoric/agoric-sdk/commit/35b2d5cb8bcab2c86a3093def400057adee73b59))
* **ag-chain-cosmos:** keep SwingSet state in the validator state dir ([#434](https://github.com/Agoric/agoric-sdk/issues/434)) ([00b874c](https://github.com/Agoric/agoric-sdk/commit/00b874c59ef29db49bec4e89e1ed9122e0a171f7)), closes [#433](https://github.com/Agoric/agoric-sdk/issues/433)
* **ansible:** double the stakes ([21fe284](https://github.com/Agoric/agoric-sdk/commit/21fe284d05094b0ac932ae39f30878e7f97c2df3))
* **api:** remove many unnecessary methods ([cf10dc3](https://github.com/Agoric/agoric-sdk/commit/cf10dc3af79cbeb33a3bc4980e6b87ac28503cd4)), closes [#41](https://github.com/Agoric/agoric-sdk/issues/41)
* **bundle:** deprecate the experimental E.C() syntax ([07f46cc](https://github.com/Agoric/agoric-sdk/commit/07f46cc47f726414410126400a7d34141230c967))
* **bundle-source:** remove `"type": "module"` from package.json ([326b00a](https://github.com/Agoric/agoric-sdk/commit/326b00af1f01383df0b3cdf3dbb9f1c6d2273002)), closes [#219](https://github.com/Agoric/agoric-sdk/issues/219)
* **captp:** use new @agoric/eventual-send interface ([d1201a1](https://github.com/Agoric/agoric-sdk/commit/d1201a1a1de324ae5e21736057f3bb03f97d2bc7))
* **cosmic-swingset:** minor UI versioning tweaks ([e0a5985](https://github.com/Agoric/agoric-sdk/commit/e0a59858ce606c31a756a0b029b57b478cfe84a0))
* **cosmic-swingset:** reduce unnecessary logs ([#425](https://github.com/Agoric/agoric-sdk/issues/425)) ([8dc31a0](https://github.com/Agoric/agoric-sdk/commit/8dc31a0d3620372523887adc7ea7c28ef4bf195d)), closes [#424](https://github.com/Agoric/agoric-sdk/issues/424)
* **cosmic-swingset:** reenable setup scripts ([e533479](https://github.com/Agoric/agoric-sdk/commit/e5334791202a89028d31ddf8ea109fe469a84943)), closes [#311](https://github.com/Agoric/agoric-sdk/issues/311)
* **deployment:** properly use agoric-sdk tag ([75dd0c3](https://github.com/Agoric/agoric-sdk/commit/75dd0c328a8aba9543d10af37408f2b4608faddc))
* **deployment:** track deployment version ([ad63fee](https://github.com/Agoric/agoric-sdk/commit/ad63fee58a55ca281a6f3b0a20392d81680ffa64))
* **deployment:** update Dockerfile for Makefile ([f5607af](https://github.com/Agoric/agoric-sdk/commit/f5607afd15742a6b5c2f064c616a2ce8bd0e6130))
* **docker:** cache Go depedency downloads to optimise docker builds ([aba22f0](https://github.com/Agoric/agoric-sdk/commit/aba22f0639ab9d92c02b5a87e30994d353762998))
* **docker:** more updates for ag-setup-solo ([e4b7c86](https://github.com/Agoric/agoric-sdk/commit/e4b7c868858329928c7fb25f4cac881d81458a99))
* **docker:** propagate git-revision correctly ([d8e6f7e](https://github.com/Agoric/agoric-sdk/commit/d8e6f7eca73a9fe6ba5ce4f9a01d38cd768c89d1))
* **docker:** remove dependency on NPM ([d3a8050](https://github.com/Agoric/agoric-sdk/commit/d3a805029da851985ae59836f76f6a4dd794488b))
* **E:** address PR comments ([a529982](https://github.com/Agoric/agoric-sdk/commit/a529982203e4842290b84f48831052fe1e6d30f9))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/agoric-sdk/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **fluentd:** tweak the Loki records ([cf62725](https://github.com/Agoric/agoric-sdk/commit/cf627258476bbee4a297082048f6f5784e2e04fc))
* **fluentd:** update cache before running apt ([6d44e70](https://github.com/Agoric/agoric-sdk/commit/6d44e70bba2f52f62b6507b98548d26aa43443d8))
* **fluentd:** update Loki store format ([a834015](https://github.com/Agoric/agoric-sdk/commit/a834015d1e4f450ddc4a69f852005da425f70fca))
* **HandledPromise:** implement specified API ([8da7249](https://github.com/Agoric/agoric-sdk/commit/8da7249764da87b7c47b89b5ccb5c1f2125ef0d1)), closes [#42](https://github.com/Agoric/agoric-sdk/issues/42)
* **Makefile:** remove old docker-build and docker-push rules ([92a3816](https://github.com/Agoric/agoric-sdk/commit/92a3816968c17fc68830ff9cc433b02d23e70314))
* **package.json:** add packages/deployment to workspaces ([b847215](https://github.com/Agoric/agoric-sdk/commit/b8472152e275611eae480427d4c2682cb7fcdd0f))
* **pserver:** use with-blocks when possible ([#384](https://github.com/Agoric/agoric-sdk/issues/384)) ([43ac9ac](https://github.com/Agoric/agoric-sdk/commit/43ac9ac087c5c221eca624b4b63c395699e956e9))
* **resolve:** protect against reentrancy attack ([#401](https://github.com/Agoric/agoric-sdk/issues/401)) ([d1f25ef](https://github.com/Agoric/agoric-sdk/commit/d1f25ef2511168bd9df8b6ca6a8edfef13f6dd2b)), closes [#9](https://github.com/Agoric/agoric-sdk/issues/9)
* **security:** update serialize-javascript dependency ([#340](https://github.com/Agoric/agoric-sdk/issues/340)) ([970edd3](https://github.com/Agoric/agoric-sdk/commit/970edd31a8caa36235fad860b3b0ee8995042d7a))
* **start:** eliminate default fake delay, and add --delay option ([28ce729](https://github.com/Agoric/agoric-sdk/commit/28ce7298370ec81ae37dcc15db3b162974eea39a)), closes [#572](https://github.com/Agoric/agoric-sdk/issues/572)
* **SwingSet:** passing all tests ([341718b](https://github.com/Agoric/agoric-sdk/commit/341718be335e16b58aa5e648b51a731ea065c1d6))
* **testnet:** properly push agoric/cosmic-swingset-setup ([d82aad6](https://github.com/Agoric/agoric-sdk/commit/d82aad6fb2ce71826fd71e2404fc1f1722ec709e))
* **timer:** don't enforce advancement, just prevent moving backwards ([7a0a509](https://github.com/Agoric/agoric-sdk/commit/7a0a50916ee98b4aad1288b34e4b1cda9b456437)), closes [#328](https://github.com/Agoric/agoric-sdk/issues/328)
* **unwrap:** pass through non-Thenables before throwing ([67aba42](https://github.com/Agoric/agoric-sdk/commit/67aba42962b10af9250248f7f1b2abc579291de6)), closes [#518](https://github.com/Agoric/agoric-sdk/issues/518)
* **ustake:** stake is actually micro-stake ([1aaf14f](https://github.com/Agoric/agoric-sdk/commit/1aaf14f078d1defb09d52692e78dabb9854bbb27))
* address PR comments ([b9ed6b5](https://github.com/Agoric/agoric-sdk/commit/b9ed6b5a510433af968ba233d4e943b939defa1b))
* **zoe:** have install accept a moduleFormat argument ([#235](https://github.com/Agoric/agoric-sdk/issues/235)) ([8621eca](https://github.com/Agoric/agoric-sdk/commit/8621eca5d2b22e3f17935b42c3e5c9cfc54e2040))


### Features

* accomodate Zoe roles as is currently designed ([d4319d1](https://github.com/Agoric/agoric-sdk/commit/d4319d173d5ade915b3132f79054926f78121a51))
* add anylogger support ([4af822d](https://github.com/Agoric/agoric-sdk/commit/4af822d0433ac2b0d0fd53298e8dc9c7347a3e11))
* Add legends to the graphs produced by the stat-logger graphing utility ([65340d9](https://github.com/Agoric/agoric-sdk/commit/65340d9e123bd64db11aa11d88035f0fcf2de93f))
* Add option to force GC after every block, add 'help' command, clean up error reporting ([e639ee5](https://github.com/Agoric/agoric-sdk/commit/e639ee5d69ce27eef40a8f0c6c8726dd81f8de3d))
* Add PDF and stdout support to stat-logger graphing ([22238e7](https://github.com/Agoric/agoric-sdk/commit/22238e75eb3e0726a7385c783c8f7678c48884d8))
* add wallet offer publicID querying API to the bridge ([4010226](https://github.com/Agoric/agoric-sdk/commit/401022662fb8776dc671a46eb5b31dd20d0bf318))
* add wallet.ping() method for testing ([1f07cd2](https://github.com/Agoric/agoric-sdk/commit/1f07cd26d55503af4dc5dbd8d3b916b323033793))
* allow subscribing to wallet offer changes ([5ad56e6](https://github.com/Agoric/agoric-sdk/commit/5ad56e6985b221e65989f4d10b39154c57d8f13c))
* default to silent unles `DEBUG=agoric` ([2cf5cd8](https://github.com/Agoric/agoric-sdk/commit/2cf5cd8ec66d1ee38f351be8b2e3c808afd554a9))
* implement the Cosmos block manager ([3a5936a](https://github.com/Agoric/agoric-sdk/commit/3a5936aeae6fc32a6075d85b7af88885e689a2ab))
* implement wallet bridge separately from wallet user ([41c1278](https://github.com/Agoric/agoric-sdk/commit/41c12789c1fd230fa8442db9e3979d0c7372025a))
* include requestContext in inboundCommand, and use it in wallet ([b332870](https://github.com/Agoric/agoric-sdk/commit/b33287032a376b4adf8c5f695321a559550401ea))
* Log (and graph) database disk usage ([9f9f5af](https://github.com/Agoric/agoric-sdk/commit/9f9f5af964d6661bb1d6bd1f2ea91098bcad62b0))
* make ERTP methods acccept promises or payments ([4b7f060](https://github.com/Agoric/agoric-sdk/commit/4b7f06048bb0f86c2028a9c9cfae8ff90b595bd7))
* new multirole (ending with '*') implementation ([442fd20](https://github.com/Agoric/agoric-sdk/commit/442fd202cdd0e361728e1dbb9e0c04ccdfb1e8d4))
* polish link-cli a little ([ffbd029](https://github.com/Agoric/agoric-sdk/commit/ffbd029e71674143adb13c03e06e68bdeff39fae))
* revamp the wallet for brands and Zoe roles ([b4a806c](https://github.com/Agoric/agoric-sdk/commit/b4a806c63a30e7cfca9a4b4c642702935e5741f4))
* separate registerAPIHandler from registerURLHandler ([7c670d9](https://github.com/Agoric/agoric-sdk/commit/7c670d9c5c92f7e229b6895625423702d39d16d2))
* use anylogger ([81a8950](https://github.com/Agoric/agoric-sdk/commit/81a8950c8f4a1e5cae26db463ff1986033e399d5))
* use anylogger to allow flexible message dispatch ([be8abc8](https://github.com/Agoric/agoric-sdk/commit/be8abc8fb8bb684273b13a1732a2bf509a962253))
* **ag-solo:** integrate wallet UI with REPL ([a193e87](https://github.com/Agoric/agoric-sdk/commit/a193e874ea373f5e6345568479ce620401147db2))
* **bigdipper:** add Big Dipper config ([f98ff43](https://github.com/Agoric/agoric-sdk/commit/f98ff43e6305e609c4ddaf953ff7b021a451ffaa))
* **bootstrap:** accept explicit semver (such as --bump=1.17.0) ([b3da002](https://github.com/Agoric/agoric-sdk/commit/b3da00237234353e8acfe121118a6a41e2ef41ba))
* **bundle-source:** make getExport evaluate separate modules ([bec9c66](https://github.com/Agoric/agoric-sdk/commit/bec9c661f9bf08ae676ba3ae3707c0e23599a58d))
* **cosmic-swingset:** use a fake chain for scenario3 ([#322](https://github.com/Agoric/agoric-sdk/issues/322)) ([f833610](https://github.com/Agoric/agoric-sdk/commit/f833610831e687c65a28a0069dc58e74b18d7321))
* **deployment:** add Prometheus support for monitoring ([713f63a](https://github.com/Agoric/agoric-sdk/commit/713f63a4b3ca347ba3c65283228dc33665fc10b3)), closes [#337](https://github.com/Agoric/agoric-sdk/issues/337)
* **E:** export E.resolve to use HandledPromise.resolve ([93c508d](https://github.com/Agoric/agoric-sdk/commit/93c508de8439d8d6b4b6030af3f95c370c46f91f))
* **eval:** end-to-end metered evaluator ([db3acfd](https://github.com/Agoric/agoric-sdk/commit/db3acfd522bd3c7c552c39bf40ebf9f021cb1090))
* **fluentd:** support Loki log store ([c4bffbf](https://github.com/Agoric/agoric-sdk/commit/c4bffbf6e175e8df8bc321d5e955e200118e61bf))
* **HandledPromise:** add sync unwrap() to get presences ([5ec5b78](https://github.com/Agoric/agoric-sdk/commit/5ec5b78a038f11d26827358c70bb6c820ed04a2e)), closes [#412](https://github.com/Agoric/agoric-sdk/issues/412)
* **ibc:** use latest cosmos-sdk/ibc-alpha branch ([153f1b9](https://github.com/Agoric/agoric-sdk/commit/153f1b9d0c1890b7534e749f1e065d5fbdfa3236))
* **init:** use --dapp-template (default @agoric/dapp-simple-exchange) ([3bdf8ff](https://github.com/Agoric/agoric-sdk/commit/3bdf8ff4476279fbb158953ec115939794d4488e))
* **link-cli:** install the Agoric CLI locally ([5e38c5a](https://github.com/Agoric/agoric-sdk/commit/5e38c5a333a09ceb7429b2a843d7e66ebb56dfc6))
* **metering:** allow the metering vat to register refill functions ([ce077a3](https://github.com/Agoric/agoric-sdk/commit/ce077a38aec75a01621ea6a115e919ae607e3aeb))
* **metering:** create a transform to limit resource use ([e2c2b68](https://github.com/Agoric/agoric-sdk/commit/e2c2b68e452eb7608301c4709929971e36d139b1))
* **nestedEvaluate:** support new moduleFormat ([deb8ee7](https://github.com/Agoric/agoric-sdk/commit/deb8ee73437cb86ef98c160239c931305fb370ad))
* **reset-state:** add command to ag-solo to reset SwingSet ([233c0ff](https://github.com/Agoric/agoric-sdk/commit/233c0ff5a682c8b25a457e9c71f9d0b08e6c78ac))
* **spawner:** implement basic metering ([8bd495c](https://github.com/Agoric/agoric-sdk/commit/8bd495ce64ab20a4f7e78999846afe1f9bce96a4))
* **start:** implement `agoric start testnet` ([cbfb306](https://github.com/Agoric/agoric-sdk/commit/cbfb30604b8c2781e564bb250dd58d08c7d57b3c))
* **SwingSet:** pass all tests with metering installed ([d2dbd2c](https://github.com/Agoric/agoric-sdk/commit/d2dbd2c17db613faa18ccfa5903fa0160f90b35e))
* **tame-metering:** new packages for metering ([d421bc5](https://github.com/Agoric/agoric-sdk/commit/d421bc52a7a7c7f781abd37305bc6d6c860c4cbb))
* **tame-metering:** no more Proxy, clean up initialization ([467d62b](https://github.com/Agoric/agoric-sdk/commit/467d62b251d576284d35fd33472ac6c58a0c6d52))
* **transform:** add support for passing RegExp literals through constructor ([5c9e1e7](https://github.com/Agoric/agoric-sdk/commit/5c9e1e71fd2ee20b565d582f438df697098d893a))
* **transform-eventual-send:** pass HandledPromise endowment to evaluator ([7a5b74d](https://github.com/Agoric/agoric-sdk/commit/7a5b74d8204a6af0d33ad05bfa67da714a0a8a5a))
* **zoe:** implement metering of contracts ([9138801](https://github.com/Agoric/agoric-sdk/commit/91388010a4c78741f27896d21df8e610c3ff3b16))


### Performance Improvements

* Remove call to `harden` in `details` for performance reasons ([de1f04b](https://github.com/Agoric/agoric-sdk/commit/de1f04b0427af163b0a50cb645d6d676f09b08de))



# 0.11.0 (2019-11-22)


### Bug Fixes

* **repl:** detect cycles when trying to stringify the value ([0d6fa9e](https://github.com/Agoric/agoric-sdk/commit/0d6fa9e1e0e255c595a86710357cfcb58b400ce7)), closes [#123](https://github.com/Agoric/agoric-sdk/issues/123)
* **rollup:** use preferBuiltins for Node.js bundling ([733faa1](https://github.com/Agoric/agoric-sdk/commit/733faa1243eb18622c568df377f67b9740a1be58))


### Features

* **abort:** provide a separate function to abort the connection ([b9ac6b5](https://github.com/Agoric/agoric-sdk/commit/b9ac6b578731013fc5d8debf45b4904a48dabb98))



## 0.4.5 (2019-11-13)



## 0.10.15 (2019-11-08)


### Bug Fixes

* **ag-setup-solo:** properly pass through the netconfig ([8dcbae1](https://github.com/Agoric/agoric-sdk/commit/8dcbae191b20a96c0133e9ce6cb4770809df87de))
* **bootstrap:** get scenario[#1](https://github.com/Agoric/agoric-sdk/issues/1) to work ([033c654](https://github.com/Agoric/agoric-sdk/commit/033c654c52e48a9b0fdae28de219ebbd19a1d823))
* **dapp:** make autoswap the default ([0ccc7c0](https://github.com/Agoric/agoric-sdk/commit/0ccc7c036e9b9fb3359eadef662631124deab33e))
* **deploy:** Remove mints in deploy scripts ([04de7b0](https://github.com/Agoric/agoric-sdk/commit/04de7b0235e303c0a95c93a5f310093e77707275))
* **E:** don't leak the makeE*Proxy functions directly ([8d5131f](https://github.com/Agoric/agoric-sdk/commit/8d5131f6a7ec35451ec85989ce7467147c7374ff))
* **provisioning-server:** robustness ([e90e6fe](https://github.com/Agoric/agoric-sdk/commit/e90e6feb9245fc98f50241fd3251bc4d54b31cb9))
* **setup:** be sure to use rsync checksum option ([584bc73](https://github.com/Agoric/agoric-sdk/commit/584bc7341920333f1ff87734c871aa346beeb37a))
* **vat-http:** use Promise.allSettled semantics to tolerate errors ([6f9aa68](https://github.com/Agoric/agoric-sdk/commit/6f9aa68894ee265f8f5c73475fb8899c44951850))
* **web:** allow web extension urls ([e40160d](https://github.com/Agoric/agoric-sdk/commit/e40160d1f6c46b2b23132198117558e8c907fe8d))


### Features

* **autoswap:** Reduce the number of awaits in init-autoswap.js ([#119](https://github.com/Agoric/agoric-sdk/issues/119)) ([32aaf84](https://github.com/Agoric/agoric-sdk/commit/32aaf8466546fbc422dbb1c7945b1274decb1d9e))
* **deploy:** allow autoswap and myFirstDapp deploys ([876038c](https://github.com/Agoric/agoric-sdk/commit/876038c599c4cc6abbccde27ee3430da534d8b72))



## 0.10.12 (2019-11-03)


### Bug Fixes

* **wallet:** copy HTML directly ([dadfac8](https://github.com/Agoric/agoric-sdk/commit/dadfac8daf22c7a567160e3b5edee81d0cb68784))


### Features

* **install:** use --force ([f6b4155](https://github.com/Agoric/agoric-sdk/commit/f6b41559221e704356bf48ceffeb2f08d35ce707))
* **startup:** Remove mints ([#116](https://github.com/Agoric/agoric-sdk/issues/116)) ([a911394](https://github.com/Agoric/agoric-sdk/commit/a911394b1c6dc80900ff19c432ebc921f93a01ac))
* **ui:** use installed contractID ([54e9a50](https://github.com/Agoric/agoric-sdk/commit/54e9a50dd79a87275a8aff857be7ab835655c0db))
* **wallet:** Make purses observable ([#115](https://github.com/Agoric/agoric-sdk/issues/115)) ([53e56fe](https://github.com/Agoric/agoric-sdk/commit/53e56fe9f1fb2c5c940314c88b363c2cca869c4a))



## 0.10.11 (2019-11-02)


### Bug Fixes

* **timer:** workaround to prevent monotonic error ([88a934b](https://github.com/Agoric/agoric-sdk/commit/88a934bcefff75bc76a0a8ac9237ec595567f849))



## 0.2.1 (2019-11-02)


### Bug Fixes

* **contract, api:** don't limit files ([8e4fd25](https://github.com/Agoric/agoric-sdk/commit/8e4fd257dfb766c1aa76ff6726212e5d021e7b58))
* **http:** walk the registeredHandlers backward properly ([157b9ad](https://github.com/Agoric/agoric-sdk/commit/157b9ad6ece1ccc9aef61c16fce9c604acf35b3f)), closes [#114](https://github.com/Agoric/agoric-sdk/issues/114)
* **vagrant:** chdir to the dapps directory ([4ca1916](https://github.com/Agoric/agoric-sdk/commit/4ca191685eab56c265e7948a8e7515a66701dbff))
* **yarn:** use local install to avoid permission problems ([0efd29b](https://github.com/Agoric/agoric-sdk/commit/0efd29b0d7f1bc2732264b6d122cc6827255b635))


### Features

* **install:** detect incorrect Go version ([6fb3722](https://github.com/Agoric/agoric-sdk/commit/6fb3722ff0393bdadb7a041e9b9da9f6a812cd8a))
* **vagrant:** add Vagrant instructions ([7e509c0](https://github.com/Agoric/agoric-sdk/commit/7e509c02ec97b28df1ee3784940a3c4d11968ea0))



## 0.1.6 (2019-11-02)


### Bug Fixes

* **start:** don't use Promise.allSettled ([a0067e1](https://github.com/Agoric/agoric-sdk/commit/a0067e1c4431427cd7930ee439a12929965c1bf1))


### Features

* **api:** deploy api handler to cosmic-swingset ([a778018](https://github.com/Agoric/agoric-sdk/commit/a778018b14520ea06ca3c6ca0a6edf1fc691804d))
* **proxy:** Added entry for bridge URL ([8b13b1e](https://github.com/Agoric/agoric-sdk/commit/8b13b1e52a8fba290347579c7f94640712cf4d39))
* **start:** implement solo mode ([71f1fb4](https://github.com/Agoric/agoric-sdk/commit/71f1fb44657923c03589a7ea79c5caa337f16b17))



## 0.10.10 (2019-11-02)


### Features

* **deploy:** upload contracts ([866a4e3](https://github.com/Agoric/agoric-sdk/commit/866a4e3fc84ba86457d568d55edc9666d687b977))
* **http:** expose registeredHandler ([e4ed2bc](https://github.com/Agoric/agoric-sdk/commit/e4ed2bc2201bd91eacf868681ec627e395c960d6))
* **web:** override html with dapp-html if it exists ([a1abbf1](https://github.com/Agoric/agoric-sdk/commit/a1abbf173d472f841b1e914b6b0137c18faed0c8))



## 0.10.9 (2019-11-02)


### Bug Fixes

* **deps:** don't depend on ertp ([97d5f63](https://github.com/Agoric/agoric-sdk/commit/97d5f63c1f60b1e2a638229097659d4f791c707a))


### Features

* **exchange-vat:** Reduce the number of round-trips ([#112](https://github.com/Agoric/agoric-sdk/issues/112)) ([e24e35f](https://github.com/Agoric/agoric-sdk/commit/e24e35f478d13ad5f4d5bde066ea19266771f601))
* **spawner:** add local vat spawner ([7e53b25](https://github.com/Agoric/agoric-sdk/commit/7e53b25d3d9be84f5f9bbec3ab84a3be675cf329))



## 0.1.1 (2019-11-02)


### Bug Fixes

* **ag_pserver:** optimize for many pre-provisioned pubkeys ([42dced0](https://github.com/Agoric/agoric-sdk/commit/42dced0fbef113668041f66821bf2d5f9cbfdfa8))
* **ag-pserver:** don't provision if none needIngress ([c1b1b65](https://github.com/Agoric/agoric-sdk/commit/c1b1b65746dc6cea9580e99f981871869128f8e7))
* **ag-pserver:** use agCosmosHelper in all places ([625e86e](https://github.com/Agoric/agoric-sdk/commit/625e86e4bf6ceb563c372aa5d20067f5eeaa0896))
* **exchange-rate:** Fix the exchange rate assay display ([cbd8b58](https://github.com/Agoric/agoric-sdk/commit/cbd8b588f527a2794af305733fd428d49898cd04))
* **exports:** export the Acorn parser we use ([1cb5497](https://github.com/Agoric/agoric-sdk/commit/1cb54975278d3a4cf017325d5fd1d3ae1a41d3b4))
* **LOADING:** make flag available to CapTP, but not home ([859e7b5](https://github.com/Agoric/agoric-sdk/commit/859e7b55441f8488c2a5d9dcd7c64f25500f4eb0))
* **package:** properly publish to `agoric` ([671ea78](https://github.com/Agoric/agoric-sdk/commit/671ea7827cd8f28529554292b94cf66d6c6697ed))
* **pipelining:** enable pipelining of GET, POST ([d500bf9](https://github.com/Agoric/agoric-sdk/commit/d500bf9f071231f757ea9895de6b42156219904b)), closes [#2](https://github.com/Agoric/agoric-sdk/issues/2)
* **setup:** properly use '-y' in Dockerfile apt-get ([82d5e83](https://github.com/Agoric/agoric-sdk/commit/82d5e83333a85c4fc14ce228c95c5e0194396903))
* **slot:** prevent crosstalk by tracking inbound vs. outbound slots ([19906c4](https://github.com/Agoric/agoric-sdk/commit/19906c4262d8175602ac4ebb2c4e14ee8a9ce140))
* **test:** use same acorn Parser as acorn-eventual-send ([de73b78](https://github.com/Agoric/agoric-sdk/commit/de73b788480e74df0590b3a8709af7caa640fd38))


### Features

* **ag-setup-solo:** new --destroy flag to reset state ([43a87ba](https://github.com/Agoric/agoric-sdk/commit/43a87babd5d2404feaa41408d62d90392a7a6d8f))
* **bundle:** backend implementation for upload-contract, register-http ([b10e244](https://github.com/Agoric/agoric-sdk/commit/b10e24491a1e42610bab065d6d5c1e0648be2324))
* **bundleSource:** use explicit acorn argument ([5aa61eb](https://github.com/Agoric/agoric-sdk/commit/5aa61eb82f35669ff82ad8b24fd98cd732c287d8))
* **DEV:** allow building of sources from cosmic-workspace ([6317d24](https://github.com/Agoric/agoric-sdk/commit/6317d24b7bf016384755fc161d0a6230a1820f7a))
* **docker/ag-solo:** have upload-contract use local install ([4239fef](https://github.com/Agoric/agoric-sdk/commit/4239fef04e87e4eaa4f1a58ebfac30f5dc07aefc))
* **has:** implement 'has' traps ([0b4b1d2](https://github.com/Agoric/agoric-sdk/commit/0b4b1d24f98be9e30a8442d783589c9606841a4b))
* **init:** first cut ([b8069f9](https://github.com/Agoric/agoric-sdk/commit/b8069f958346970445dec9ff90ffebb2428c62b5))
* **init:** more templates ([2d19210](https://github.com/Agoric/agoric-sdk/commit/2d192102520e56db74bb33d434919e2dce3fd6a8))
* **init-autoswap:** bundle command to initialize autoswap ([4c5a146](https://github.com/Agoric/agoric-sdk/commit/4c5a14657d60bf62f0b6fc582c9c19a15853eff5))
* **install:** npm/yarn install ([ad66d97](https://github.com/Agoric/agoric-sdk/commit/ad66d97a94b42f5c2c307c9e9a3ad6a596305ee8))
* **install:** prefer yarn, and install it if not there ([c8add72](https://github.com/Agoric/agoric-sdk/commit/c8add72a5463276b92cf14a4f879a6440cdd6a69))
* **main:** initial cut ([ebde410](https://github.com/Agoric/agoric-sdk/commit/ebde410866c36936b46da9129036f11d661f1264))
* **main:** remove some ambient authority ([dd5accf](https://github.com/Agoric/agoric-sdk/commit/dd5accf9394cb7fa6bc800ed73f629a11a08f1b7))
* **wallet-vat,autoswap-vat:** Create wallet & autoswap backend ([207f884](https://github.com/Agoric/agoric-sdk/commit/207f88451d268d4492db55db7441e4d05c6ba5d7))



## 0.10.7 (2019-10-23)


### Bug Fixes

* **captp:** inband CTP_ABORT to reject all pending promises ([fb3630a](https://github.com/Agoric/agoric-sdk/commit/fb3630a8759a15c94965475682ecfbe5f3b7fe1b))
* **registar:** add unit tests ([772e907](https://github.com/Agoric/agoric-sdk/commit/772e9075a9fff49375592ec7776173beec75baa6))
* **registrar:** PR comments and more tests ([41725bf](https://github.com/Agoric/agoric-sdk/commit/41725bfa4bfc4be456c2123da708b955c778c149))
* **start:** ameliorate race conditions ([98db740](https://github.com/Agoric/agoric-sdk/commit/98db74016f6b6a24e9bf9885334dbc64f8a30930))
* **test:** remove registrar test.only ([9538fda](https://github.com/Agoric/agoric-sdk/commit/9538fdadf53f04e53aa419cb3aaf6e46d546060f))
* **upload-contract:** no automatic contracts/* upload ([654bd5e](https://github.com/Agoric/agoric-sdk/commit/654bd5eed6de2fdeedd8e26757c23590e4990bc9))


### Features

* **disconnected:** function to break all pending promises ([79a930a](https://github.com/Agoric/agoric-sdk/commit/79a930a6c1d0ce9825541675b6eeed5190aa69c1))
* **index:** first cut ([f5606fb](https://github.com/Agoric/agoric-sdk/commit/f5606fb1b3b29fe69beaa9c2889d247131710cc1))
* **vats:** add home.registrar and home.moolah ([4b8ce42](https://github.com/Agoric/agoric-sdk/commit/4b8ce42e7f0384899bb5db1bef8511f09e57d31b))



## 0.4.4 (2019-10-17)


### Features

* **E:** new shortcuts to avoid full chaining ([ebd7e2e](https://github.com/Agoric/agoric-sdk/commit/ebd7e2ef9acfc3316aa07f8bd3dbf3050363615d))



## 0.10.5 (2019-10-16)


### Bug Fixes

* **upload-contract:** prevent race condition when restarting ag-solo ([d478c09](https://github.com/Agoric/agoric-sdk/commit/d478c09a25e7d51c10f4f5e4a2ff70583bd628ff))



# 0.1.0 (2019-10-16)


### Bug Fixes

* **captp:** be sure to bind the questionID, promiseID ([0fd6f30](https://github.com/Agoric/agoric-sdk/commit/0fd6f30b9b50800d1d9ff32cac76ff9fb8c75408))
* **origin:** allow any localhost origin ([80e35fc](https://github.com/Agoric/agoric-sdk/commit/80e35fca88e61384f92ee4ab6b555ebdce162d2f))
* **test-node-version:** temporarily disable until Node.js v12 is LTS ([5852817](https://github.com/Agoric/agoric-sdk/commit/5852817fa1394b75b33a0e814d35409633135b41))
* **upload-contract:** make deterministic ([a24124a](https://github.com/Agoric/agoric-sdk/commit/a24124a5622532d182cac11fbc8661d6aaccf15c))
* **upload-contract:** only run on start if we have a client role ([2101e20](https://github.com/Agoric/agoric-sdk/commit/2101e201892921f84930f0fb4ef90f0c329db37a))


### Features

* **api:** implement dispatch function, more exports ([cad73a2](https://github.com/Agoric/agoric-sdk/commit/cad73a2928c201dfc0a1cf79c5cb0e802ea1c0b9))
* **web:** enforce same-origin for websocket and /vat post ([a704120](https://github.com/Agoric/agoric-sdk/commit/a7041205de4ce95e7aea0be8e53310efdc7c1634))
* **zoe:** allow specifying additional endowments for contracts ([#155](https://github.com/Agoric/agoric-sdk/issues/155)) ([a209c90](https://github.com/Agoric/agoric-sdk/commit/a209c902472f7d40ef65727826f0b81fbdbac199))
* **zoe:** implement 'home.zoe' and Zoe contract upload ([a1a73bd](https://github.com/Agoric/agoric-sdk/commit/a1a73bda9e9ea7987bce6af2e6651016bb48a12e))


### BREAKING CHANGES

* **api:** the default export is now named makeCapTP

Other named exports are E, harden, HandledPromise, Nat.



## 0.4.3 (2019-10-14)


### Bug Fixes

* **applyMethod:** better error reporting for missing methods ([593f142](https://github.com/Agoric/agoric-sdk/commit/593f142e27b5104e11d6c3eecac2869bd9f27792))
* **E.C:** anonymous methods now work ([c0e11a8](https://github.com/Agoric/agoric-sdk/commit/c0e11a88c099ada89ad9394e4227c861fd09ca61))


### Features

* **bootstrap:** allow a thunk instead of a bootstrap object ([d4582fc](https://github.com/Agoric/agoric-sdk/commit/d4582fc663343d119ca4a9664d7f730fc4657366))
* **contractHost:** support new moduleFormat bundling ([185016e](https://github.com/Agoric/agoric-sdk/commit/185016e97d5652c779262001594462c4d172ce65))
* **contracts:** upload to contractHost ([f9e7b5e](https://github.com/Agoric/agoric-sdk/commit/f9e7b5e24602c354210a95444665c037d0cb65c6))
* **contracts:** use home.uploads scratch pad for upload history ([2c8ec64](https://github.com/Agoric/agoric-sdk/commit/2c8ec646db1659a8824e818a20bcca2f0ddd0ff7))
* **upload-contract:** push zoe-* contracts as well ([32037fb](https://github.com/Agoric/agoric-sdk/commit/32037fb0ac1781f42837ba4189551cd0ca54dd84))



## 0.4.1 (2019-10-11)


### Features

* **E.C:** implement strawman chaining proxy ([f97d5a4](https://github.com/Agoric/agoric-sdk/commit/f97d5a4859b7ec1a3505e9afee62d6fe900cbcdd))
* **HandledPromise:** add applyFunction static methods ([4f0e4bf](https://github.com/Agoric/agoric-sdk/commit/4f0e4bf7809019d98d034ec5c01891e5d595ef7f))
* **scenario2:** enable multiple solo nodes ([c8337f9](https://github.com/Agoric/agoric-sdk/commit/c8337f9036fcf7a2c8289b6d89ba08c2c5e49dfd))



## 0.10.4 (2019-10-09)



## 0.0.27 (2019-10-08)



# 0.4.0 (2019-10-08)



## 0.10.3 (2019-10-07)



## 0.10.2 (2019-10-04)



## 0.10.1 (2019-10-03)



## 0.0.26 (2019-10-02)



## 0.3.3 (2019-10-02)



## 0.0.25 (2019-10-02)



## 0.3.2 (2019-10-01)



## 0.3.1 (2019-10-01)



# 0.10.0 (2019-09-26)



## 0.0.24 (2019-09-26)



## 0.0.23 (2019-09-26)



# 0.3.0 (2019-09-26)



## 0.2.5 (2019-09-26)



## 0.9.1 (2019-09-18)



## 0.0.22 (2019-09-18)



# 0.9.0 (2019-09-11)



## 0.8.8 (2019-09-10)



## 0.0.21 (2019-09-09)



## 0.2.4 (2019-09-06)



## 0.8.7 (2019-09-05)



## 0.8.6 (2019-09-04)



## 0.0.20 (2019-09-03)


### Reverts

* Revert "require Node.js v12" ([6feaf2a](https://github.com/Agoric/agoric-sdk/commit/6feaf2a601152413a32e2d4b10a6d2f29fa57fd4)), closes [#99](https://github.com/Agoric/agoric-sdk/issues/99)



## 0.8.5 (2019-08-28)



## 0.8.4 (2019-08-21)



## 0.8.3 (2019-08-16)



## 0.8.2 (2019-08-16)



## 0.8.1 (2019-08-14)



# 0.8.0 (2019-08-14)



## 0.2.3 (2019-08-13)



## 0.7.8 (2019-08-07)



## 0.0.19 (2019-08-06)



## 0.7.7 (2019-08-06)



## 0.7.5 (2019-08-01)



## 0.0.18 (2019-08-01)


### Reverts

* Revert "index.js: share the unfulfilled handler in promise chains" ([988b3fc](https://github.com/Agoric/agoric-sdk/commit/988b3fcf319f6bdde49e02c7f23530220c9d7e62))



## 0.0.17 (2019-07-31)



# 0.2.0 (2019-07-31)


### Bug Fixes

* better @agoric/evaluate integration ([e906028](https://github.com/Agoric/agoric-sdk/commit/e906028073369153339e7e7103c8a972d06aa41c))



## 0.0.16 (2019-07-24)



## 0.1.10 (2019-07-13)


### Reverts

* Revert "fix: invoke the handler synchronously" ([b2e5d08](https://github.com/Agoric/agoric-sdk/commit/b2e5d08fb68edfb7c48f12fb1b1f57214ab381dc))



## 0.1.9 (2019-07-13)


### Bug Fixes

* invoke the handler synchronously ([6d957e6](https://github.com/Agoric/agoric-sdk/commit/6d957e689c6ea084d87bf7d3dfb79264578bcade))



## 0.1.8 (2019-07-12)



## 0.1.7 (2019-07-12)



## 0.1.4 (2019-07-11)


### Bug Fixes

* properly postpone multiple arguments ([54d53d4](https://github.com/Agoric/agoric-sdk/commit/54d53d44179dffb09784191d4782f195de6d4070)), closes [#9](https://github.com/Agoric/agoric-sdk/issues/9) [#12](https://github.com/Agoric/agoric-sdk/issues/12)



## 0.1.3 (2019-07-10)



## 0.7.3 (2019-06-20)


### Bug Fixes

* prefix the GetMailbox Has check ([ebd61e4](https://github.com/Agoric/agoric-sdk/commit/ebd61e4b486ca758b1307d5a175f469b8e138cb5))
* pserver ag-cosmos-helper binary ([b4d55d7](https://github.com/Agoric/agoric-sdk/commit/b4d55d76bfef188b0334c237d34a18b33a2643e0))
* syntax ([699311e](https://github.com/Agoric/agoric-sdk/commit/699311efcf74b838b9a86cc451843b2faed8ec6e))


### Reverts

* Revert "wire together 'user' storage device" ([e2fe21b](https://github.com/Agoric/agoric-sdk/commit/e2fe21b7bab032afa4c3bb25679c5211c9982c0c))
