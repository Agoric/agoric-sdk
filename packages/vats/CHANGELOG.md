# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.15.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.15.0...@agoric/vats@0.15.1) (2023-06-09)

**Note:** Version bump only for package @agoric/vats





## [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.14.1...@agoric/vats@0.15.0) (2023-06-02)


### ⚠ BREAKING CHANGES

* rename EndorsedUI to ReferencedUI

### Features

* **board-utils:** vbankAssets in makeAgoricNamesRemotesFromFakeStorage ([0a7bc2c](https://github.com/Agoric/agoric-sdk/commit/0a7bc2c806d80c93d20a9181d803ff9db0b709bd))
* rename EndorsedUI to ReferencedUI ([8e904a9](https://github.com/Agoric/agoric-sdk/commit/8e904a9e379d69aa0c2a633ff2d6b3afb1b8005d))


### Bug Fixes

* **vat-bank:** getPurse race ([185a4f0](https://github.com/Agoric/agoric-sdk/commit/185a4f0ff14053dc85a30d383b55c9286532f0da))
* **vat-bank:** use JSON for composite string keys ([5fc1179](https://github.com/Agoric/agoric-sdk/commit/5fc1179abf7d84d64b120a8df00f54d50217500b))
* **vaults:** address a divide-by-zero; correct penalty w/no bidders ([5e8b363](https://github.com/Agoric/agoric-sdk/commit/5e8b3634bf399960b19378fd3b8ea720edcb0e37)), closes [#7785](https://github.com/Agoric/agoric-sdk/issues/7785)



### [0.14.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.14.0...@agoric/vats@0.14.1) (2023-05-24)

**Note:** Version bump only for package @agoric/vats





## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.13.0...@agoric/vats@0.14.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* test-vaults-config -> itest-vaults-config to avoid conflict
* remove obsolete Treasury
* emit smallcaps-format data in all marshallers
* **priceAuthority:** canonicalize registry
* **vaults:** correct terminology for debt
* **auction:** Currency → Bid
* --giveCurrency option becomes --give and likewise
--wantCollateral -> --want. Use snake-case for options throughout to
match cosmos-sdk style

 - `bid` commands integrate `wallet send` step
   - show bid result
 - use only liveOffers for inter bid list by default
   - to show all: --all
 - fix: provide --allow-spend for tryExitOffer
   unless/until we change the wallet contract
 - don't show redundant result in error case
 - trial: use offer safe want in by-price bids
 - leave exit onDemand implicit
 - refactor:
   - factor out outputActionAndHint
   - allow explicit io for execSwingsetTransaction
     - combine options into one object
   - factor out storedWalletState
   - factor pollBlocks out of pollTx
 - update tests

feat: inter bid by-discount sends; --generate-only; list --all

 - bid by-discount, like by-price, sends the tx
   - factor out placeBid, SharedBidOpts, withSharedBidOptions
 - bid list uses activeOffers unless --all is given
 - support --generate-only
 - use snake-case for option names; avoid [xx] optional syntax
 - give PATH clue everywhere execFileSync is used
 - test.todo()s
 - code polish:
   - expand file, function docs
   - refactor: hoist bidInvitationShape
* **wallet:** reject executeOffer on failure
* **notifier:** tidy up the implementation
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies (#7074)
* rename 'fit' to 'mustMatch'
* remove storeName parameter

### Features

* initialize vstorage for purchased/provisioned wallets ([2dad4dc](https://github.com/Agoric/agoric-sdk/commit/2dad4dcdbdc8be9762465ece8baf4e5e5ffe1202))
* **boot:** terminate bootstrap vat if boot fails ([1f60c25](https://github.com/Agoric/agoric-sdk/commit/1f60c2572b9b191cee15fb7ff516a6c8b11c7512))
* **bootstrap:** diagnostics object ([1c42d09](https://github.com/Agoric/agoric-sdk/commit/1c42d0993dd35016516366905cecdd5756a25826))
* **bootstrap:** save privateArgs into diagnostics ([8c3626f](https://github.com/Agoric/agoric-sdk/commit/8c3626f374d6ae876406e0c887b199d1d5ac1e90))
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric-sdk/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric-sdk/issues/7482)
* add powerStore to bootstrap space ([b8623fc](https://github.com/Agoric/agoric-sdk/commit/b8623fc387d0bbd3021992367a540a6af266a443))
* Add SwingSet configuration to purge vstorage within (re-)bootstrap ([f248e91](https://github.com/Agoric/agoric-sdk/commit/f248e9116512374fb95f789b26e27b66cd5c34ca)), closes [#7681](https://github.com/Agoric/agoric-sdk/issues/7681)
* **governor:** upgradable ([9a1a9c1](https://github.com/Agoric/agoric-sdk/commit/9a1a9c117e3819115544f729c6774b5071083458))
* **internal:** makeFakeStorageKit supports "get" and "entries" ([6a69aab](https://github.com/Agoric/agoric-sdk/commit/6a69aab5cb54faae5af631bbc2281e4fc4ede8e0))
* awaitVatObject rawOutput ([004e290](https://github.com/Agoric/agoric-sdk/commit/004e290faa2bef5861290d29ae6f2cf6999469fb))
* change offerArgs keyword from want to maxBuy, wire through CLI ([#7451](https://github.com/Agoric/agoric-sdk/issues/7451)) ([7cd7bb7](https://github.com/Agoric/agoric-sdk/commit/7cd7bb774981620f76b30aca217d8e5428f8987d))
* clientSupport for bidding, reserve ([3a27543](https://github.com/Agoric/agoric-sdk/commit/3a27543e3fef3587d26fe3719bad758edebce275))
* durable agoricNames in its own vat ([526396e](https://github.com/Agoric/agoric-sdk/commit/526396e5dae166979cb24496c7d208da4a837a7d))
* durable namehub with .has(), .entries(false) ([11e61b5](https://github.com/Agoric/agoric-sdk/commit/11e61b5401755be48c8a3033118666a9aada63ed))
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* introduce auctioneer to econCommitteeCharter ([af1b253](https://github.com/Agoric/agoric-sdk/commit/af1b2538924e2112448b026901dfb7c37dce2f86))
* makeVatSpace() ([3dcc64a](https://github.com/Agoric/agoric-sdk/commit/3dcc64a16208c855f836177171d508f5e6d5ab76))
* nameHub: mixinMyAddress ([6c305c4](https://github.com/Agoric/agoric-sdk/commit/6c305c4899d3066bcaa732f9832388fa9c99ff8c))
* promise space backed by store excludes non-keys ([f7c72f8](https://github.com/Agoric/agoric-sdk/commit/f7c72f890ee648e2706118091dacd2c5bc4679a6))
* PromiseSpace hooks with store support ([15d14a3](https://github.com/Agoric/agoric-sdk/commit/15d14a31726621790550acc10fa1597eb2793df2))
* provideInertBrand from agoricNames vat ([5d867f9](https://github.com/Agoric/agoric-sdk/commit/5d867f913e1926c371d82a2da1d751d309f35c6d))
* publish agoricNames.brand.timer ([51235d7](https://github.com/Agoric/agoric-sdk/commit/51235d72f8c657dc3f3daed837eb089066fe2735))
* save createVat() results durably ([6009893](https://github.com/Agoric/agoric-sdk/commit/60098937d6922977f7a3f94c4098b3649536baa5))
* save most bootstrap powers to durable storage ([7b4212b](https://github.com/Agoric/agoric-sdk/commit/7b4212b73aa30259a07f856d9d257c8c5e3484d0))
* store bootstrap contract start results durably ([70a50f6](https://github.com/Agoric/agoric-sdk/commit/70a50f67a0a34e58d7e1926cebc63a7bde4ffa0f))
* **bundleTool:** idempotent provideBundleCache ([026bcd4](https://github.com/Agoric/agoric-sdk/commit/026bcd4abe39fa2c73a05c3837b7e04082db1157))
* **core:** HighPrioritySendersManager ([7b382e4](https://github.com/Agoric/agoric-sdk/commit/7b382e49a1521d367c5b8db18fa7efa2b77ef7e3))
* **econComittee:** upgradable ([a07acef](https://github.com/Agoric/agoric-sdk/commit/a07acef7d590b289b92240b98046aa6b756d982f))
* **NameHub:** NameAdmin.provideChild() ([99095fb](https://github.com/Agoric/agoric-sdk/commit/99095fb277fea9fabb1414c221518b46c8f7514e))
* **priceAuthority:** canonicalize registry ([9a6466d](https://github.com/Agoric/agoric-sdk/commit/9a6466d87061f93f61fde1f39562971e84d8f027))
* **priceAuthority:** registry singleton durable ([3d20838](https://github.com/Agoric/agoric-sdk/commit/3d20838953dd216e44cc5488922ce09ed7d51a56))
* **provisioning:** durable vat for namesByAddress ([5d32752](https://github.com/Agoric/agoric-sdk/commit/5d327522abec3969c09bdfc4728f1e2b0e173c84))
* **provisionPool:** durable ProvisionPoolKit ([59db213](https://github.com/Agoric/agoric-sdk/commit/59db2132c133cc909805d98887039cc3731b0f99))
* **provisionPool:** upgradable ([00934ca](https://github.com/Agoric/agoric-sdk/commit/00934ca93a10dd50229d111daab55350528c65a2))
* **psm:** validate terms and args before start ([d09f21b](https://github.com/Agoric/agoric-sdk/commit/d09f21ba2b9f2c49488455008efdda8fb5601868))
* **vats:** add vat labels to contracts ([dbef5e5](https://github.com/Agoric/agoric-sdk/commit/dbef5e5d53f6b9da5c8fc96ca7b5e61558b39fa9))
* **vats:** allow replacing a scoped bridge handler ([#7609](https://github.com/Agoric/agoric-sdk/issues/7609)) ([09561e3](https://github.com/Agoric/agoric-sdk/commit/09561e34f31e345b9e40b4f6883eb0ba190e6a8b))
* **vats:** fully durable `vat-bank.js` ([a83bbff](https://github.com/Agoric/agoric-sdk/commit/a83bbff424caf8a55f9172138e944fc663ce6b26))
* **vats:** zoned `virtual-purse.js` ([ef542e7](https://github.com/Agoric/agoric-sdk/commit/ef542e7846cf55965b8481e8853d185ebd6efb4f))
* start PSM contracts with metrics, governance from previous published state ([#7480](https://github.com/Agoric/agoric-sdk/issues/7480)) ([1a65832](https://github.com/Agoric/agoric-sdk/commit/1a65832592a0d5c29326d9a666328662dd8740f9)), closes [#6645](https://github.com/Agoric/agoric-sdk/issues/6645)
* tools to start contracts, being sure to save adminFacet ([ad5dfc3](https://github.com/Agoric/agoric-sdk/commit/ad5dfc31eec07ea7b0d998ab8ac7daccf22ee6fb))
* UX for `inter bid` ([52d93c3](https://github.com/Agoric/agoric-sdk/commit/52d93c33edbad2bebd54a6eb967853e7292de2e7))
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies ([#7074](https://github.com/Agoric/agoric-sdk/issues/7074)) ([ed5ee58](https://github.com/Agoric/agoric-sdk/commit/ed5ee58a276fce3c55f19e4f6f662ed579896c2c)), closes [#7047](https://github.com/Agoric/agoric-sdk/issues/7047)
* **auction:** add an auctioneer to manage vault liquidation ([#7000](https://github.com/Agoric/agoric-sdk/issues/7000)) ([398b70f](https://github.com/Agoric/agoric-sdk/commit/398b70f7e028f957afc1582f0ee31eb2574c94d0)), closes [#6992](https://github.com/Agoric/agoric-sdk/issues/6992) [#7047](https://github.com/Agoric/agoric-sdk/issues/7047) [#7074](https://github.com/Agoric/agoric-sdk/issues/7074)
* **auction:** clearer bid offer result message ([048a7db](https://github.com/Agoric/agoric-sdk/commit/048a7db523b727c6959c0c4fb3782ed3508e32e8))
* **board-utils:** BoardRemote like Remotables ([3aa44de](https://github.com/Agoric/agoric-sdk/commit/3aa44debbdc955892611ba870478fb088395cf10))
* **bridge:** make durable ([9f3895f](https://github.com/Agoric/agoric-sdk/commit/9f3895f8d95e0da62ee2894ed17c3b7bed476b7f))
* **inter-protocol:** separate inviteCommitteMembers from inviteToCharter ([4c5340d](https://github.com/Agoric/agoric-sdk/commit/4c5340d9a40ecd9c27d68aee48a4d97a868f5eb9))
* **notifier:** tidy up the implementation ([89af682](https://github.com/Agoric/agoric-sdk/commit/89af6827e88966c836bf28f5900edf189aab9926))
* **smart-wallet:** publish possibly exitable offers ([de0170a](https://github.com/Agoric/agoric-sdk/commit/de0170add5bd4c82cbef23431bffaa95f7007880))
* **vats:** bootstrap config for vaults testing ([0059c7e](https://github.com/Agoric/agoric-sdk/commit/0059c7e88a0bbb1b85be69c68ad75ad87e1219cd))
* **vats:** colocate chainStorage with bridgeManager ([132046a](https://github.com/Agoric/agoric-sdk/commit/132046a50ffac8b85ad2a7dca250a397d5887862))
* **vats:** export makeAgoricNamesAccess at package level ([9ae7701](https://github.com/Agoric/agoric-sdk/commit/9ae7701bf9c110703c303eefae440f8209c50a63))
* **vats:** harmonise core/boot.js and boot-psm.js ([4f6635e](https://github.com/Agoric/agoric-sdk/commit/4f6635e550b926d3ca43d9075f26fef3b810817d))
* **vats:** make walletFactory a coreProposal ([ef1d6b9](https://github.com/Agoric/agoric-sdk/commit/ef1d6b91036e4450563294c62236fbe453a7f532))
* **vats:** plausible initial ATOM price for vaults test config ([1f8c6ce](https://github.com/Agoric/agoric-sdk/commit/1f8c6cea456bf4b47275c7ed3e5a127f1c13d780))
* **vats:** provide one `icacontroller-*` port per client ([5406eb7](https://github.com/Agoric/agoric-sdk/commit/5406eb70daa42ef80e1ecb287a37ee54fe7230f1))
* **vats:** publish vbank asset list with agoricNames ([53ea8b8](https://github.com/Agoric/agoric-sdk/commit/53ea8b86526329e71f6e52ff9a8292365443319c))
* **vats:** Scoped bridge managers ([11f6429](https://github.com/Agoric/agoric-sdk/commit/11f64298d8529cca249d2933894236dc534dfe3e))
* **vats:** share Invitation issuer/brand in agoricNames ([819ed35](https://github.com/Agoric/agoric-sdk/commit/819ed350a4d2ca3b527c6a9b51dba847856aa2df))
* **vats:** update devnet config to post-Pismo ([3eca8d6](https://github.com/Agoric/agoric-sdk/commit/3eca8d614902669038c133a4ca45465a08b81a0f))
* **vats:** upgradeable board ([b990271](https://github.com/Agoric/agoric-sdk/commit/b990271f07ebb07bef3af18924e9fd7429e23f88))
* **vats:** upgradeable mintHolder ([2648658](https://github.com/Agoric/agoric-sdk/commit/2648658224bfbbce253c26a35d54759aeaf67352))
* **vaults:** set endorsedUi default from chain config ([fc0b2fc](https://github.com/Agoric/agoric-sdk/commit/fc0b2fca4bd26f5b35504109143a51da5d0a059f))
* **wallet:** executeOffer throw errors ([224dbca](https://github.com/Agoric/agoric-sdk/commit/224dbca918343608d53f691a448171c8a48d283e))
* **wallet:** record bridge errors to vstorage ([f8581e9](https://github.com/Agoric/agoric-sdk/commit/f8581e95311f7cb4105f6d81f0ac7b6a9121b68f))
* **wallet:** reject executeOffer on failure ([308caab](https://github.com/Agoric/agoric-sdk/commit/308caab24c1680c2c7910eff8128f9089dedf26d))
* board-utils ([4f80ad3](https://github.com/Agoric/agoric-sdk/commit/4f80ad3cac3e47a89834f7f98330a47141b6e235))
* boot-oracles ([ce8f8de](https://github.com/Agoric/agoric-sdk/commit/ce8f8de65ad4c14b4e8d699cd721683cfa1cc495))
* cache bundles in initializeSwingset ([6e57171](https://github.com/Agoric/agoric-sdk/commit/6e57171ef303334e4cb776ba3fa503f5219d409e))
* getPath() on StorageNode and StoredSubscriber ([dae47a5](https://github.com/Agoric/agoric-sdk/commit/dae47a553288335960b5e4f2741a09b87ae896bc))
* hold onto adminFacets in bootstrap ([#6094](https://github.com/Agoric/agoric-sdk/issues/6094)) ([a2ecdec](https://github.com/Agoric/agoric-sdk/commit/a2ecdecdfb35bc752af2d5d9cc611a1d00d489cf)), closes [#6034](https://github.com/Agoric/agoric-sdk/issues/6034)
* testing supports in bootstrap ([197a6e3](https://github.com/Agoric/agoric-sdk/commit/197a6e3b8b1f6632f4e159aefbf66a395ebdc292))


### Bug Fixes

* **vaults:** return correct collateral after liquidation ([d86fc99](https://github.com/Agoric/agoric-sdk/commit/d86fc9959192799e9b55278ee26f88829ef21764)), closes [#7779](https://github.com/Agoric/agoric-sdk/issues/7779) [#7346](https://github.com/Agoric/agoric-sdk/issues/7346)
* test-vaults-config -> itest-vaults-config to avoid conflict ([db8f915](https://github.com/Agoric/agoric-sdk/commit/db8f915f579293d373d9f395dae28da383fab8a3))
* **core:** floating promises ([e8bf20d](https://github.com/Agoric/agoric-sdk/commit/e8bf20d59502994c2a2e517c3c6f866d7e83f1e6))
* **governance:** governor adminFacet handling ([785950a](https://github.com/Agoric/agoric-sdk/commit/785950ac02dbff9c9948f11d38f35924b0f36a9b))
* **provisionPool:** handle restartContract ([cb49fd5](https://github.com/Agoric/agoric-sdk/commit/cb49fd5a7f6f2a5c3d0b6ca8509dc7b40705fff5))
* **provisionPool:** publish metrics at start of every incarnation ([cdacfc4](https://github.com/Agoric/agoric-sdk/commit/cdacfc4dac8cdd0e71580bc914e073f1b488f320))
* **provisionPool:** publishMetrics() for overrideMetrics() ([3d4997a](https://github.com/Agoric/agoric-sdk/commit/3d4997a2a3955ac977ec506611ec749ba1885512))
* **vats:** Be mindful of unsettled promises ([5a1e322](https://github.com/Agoric/agoric-sdk/commit/5a1e32243ff0ae51db9ef6dc2bd2e13f59881037))
* **vats:** Extract revivable wallet addresses from the correct chain storage path ([2454d3f](https://github.com/Agoric/agoric-sdk/commit/2454d3f48eefb2bdea5a0d03a250d8a5a74b0ba3))
* **vats:** make BankManager durable ([d8b3eaf](https://github.com/Agoric/agoric-sdk/commit/d8b3eaf491c9cc9e98732c79cc4bb7acea26478d))
* **vats:** make getAssetSubscription return an exo subscription ([98a5325](https://github.com/Agoric/agoric-sdk/commit/98a5325c1e2abd49060ccd0b7bd64553a7caed20))
* **vats:** Revert breaking change to contract facets ([94081be](https://github.com/Agoric/agoric-sdk/commit/94081be1169541e976f5ca8aa965f541b41aae95))
* **vats:** Store and read vstorage StreamCell values correctly ([de7a92f](https://github.com/Agoric/agoric-sdk/commit/de7a92fc4faeaebcd7994432363f9bc55515caeb))
* **vaultFactory:** terminate on failure to start() ([193e8ec](https://github.com/Agoric/agoric-sdk/commit/193e8ec0f0c36eb3f9b0388597a919910d9a276b))
* avoid AssetPublisher bootstrap export ([8b23b95](https://github.com/Agoric/agoric-sdk/commit/8b23b959ba7f04fc2f009e1293f6339b7dabf6a7))
* avoid exporting USD oracle brand from bootstrap ([445a0fe](https://github.com/Agoric/agoric-sdk/commit/445a0fe7d8baca54b18dd2fc8108f93e41e84543))
* don't drop the rawBootstrap promise ([90a742a](https://github.com/Agoric/agoric-sdk/commit/90a742a21e1cdc26169f991b3f7fd518ab77dca1))
* Harden facets returned from produceStartGovernedUpgradable ([bee4aaa](https://github.com/Agoric/agoric-sdk/commit/bee4aaacfb28b03c5d0a991a8817f6ceecb9e2d0))
* Improve the smart wallet revival handshake ([69ec2e7](https://github.com/Agoric/agoric-sdk/commit/69ec2e76f06cf87454d087adfa2ef6c2adcea8a0))
* Preserve provisionPool metrics across bulldozer upgrade ([50d0eaf](https://github.com/Agoric/agoric-sdk/commit/50d0eaf999b93c4e578ed1a924428e9c5146770a)), closes [#7705](https://github.com/Agoric/agoric-sdk/issues/7705)
* Preserve smart wallets through bulldozer upgrade ([160bf6c](https://github.com/Agoric/agoric-sdk/commit/160bf6cad0bbdfe6a245f6b7a8e260d244c44f21)), closes [#7537](https://github.com/Agoric/agoric-sdk/issues/7537)
* Process remotables in vstorage data migrated through bootstrap ([433c1f1](https://github.com/Agoric/agoric-sdk/commit/433c1f184c76758489670f8e4809eb0baf04ece8))
* provisionPool metrics in exportStorageSubtrees ([1404b3f](https://github.com/Agoric/agoric-sdk/commit/1404b3f742d8ef341101258bdf805b03110af190))
* **vats:** fix promise space reset() misbehavior ([c191ee1](https://github.com/Agoric/agoric-sdk/commit/c191ee185d8f43b083fb2e3958859f20f0299dda)), closes [#7709](https://github.com/Agoric/agoric-sdk/issues/7709)
* privateArgsShape for restart ([fd6572e](https://github.com/Agoric/agoric-sdk/commit/fd6572e35fe2de24ad25939a4e0da774bd3af0e5))
* **AgoricNames:** throw publishing errors ([44fdc31](https://github.com/Agoric/agoric-sdk/commit/44fdc31d9d372d63c627eaba6a3efe6867211e3c))
* **types:** PromiseSpace ([fc89a56](https://github.com/Agoric/agoric-sdk/commit/fc89a56ec481221cb35e7677c820631f89ffde3c))
* **vats:** Preserve receiver for unmarshalFromVstorage fromCapData callbacks ([21809ba](https://github.com/Agoric/agoric-sdk/commit/21809bacc7112592937939b7737d0b5c94cba8d7))
* **zoe:** Add explicit makeDurableZoeKit ([a3f9dc0](https://github.com/Agoric/agoric-sdk/commit/a3f9dc054b26ede9916e10c0c310f8158b6be0cc))
* **zoe:** Upgradable Zoe vat ([83a5ab7](https://github.com/Agoric/agoric-sdk/commit/83a5ab74ba6e7b55097dc0d3acac10b0404c56bb))
* NameHub.updated promise handling ([3a14d30](https://github.com/Agoric/agoric-sdk/commit/3a14d309f102776fdcd1b1d3979f153b55a227c7))
* NameHub.updated promise handling ([14eddab](https://github.com/Agoric/agoric-sdk/commit/14eddab1ab0fdff1e2892172f396705f74d42e47))
* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric-sdk/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* **ERTP:** `getCurrentAmountNotifier` returns a `LatestTopic` ([735d005](https://github.com/Agoric/agoric-sdk/commit/735d005ec4f4087a4055d48ff1dd1801c9a3d836))
* **vats:** use zoned `virtual-purse.js` in `vat-bank.js` ([777aac0](https://github.com/Agoric/agoric-sdk/commit/777aac0060861d21e716bb9bebf5996f6c0b5739))
* remove AssetHub attenuator bootstrap export ([a94e313](https://github.com/Agoric/agoric-sdk/commit/a94e31301fd8191513936b6eaca012515afecda5))
* remove well-known-name limitation on reserved brands etc. ([1062c0a](https://github.com/Agoric/agoric-sdk/commit/1062c0a99e92f7d3b178237861eba00c1eda427e))
* **auction:** Currency → Bid ([650cf4c](https://github.com/Agoric/agoric-sdk/commit/650cf4c6527c92724dac7b4587bdbecd690a6abc))
* **auction:** durability ([de394d3](https://github.com/Agoric/agoric-sdk/commit/de394d37288005f77ad17c19ae121eeb7cd5abc2))
* **inter-protocol:** save price feed and vbank admin facets ([83a7837](https://github.com/Agoric/agoric-sdk/commit/83a78378681cf0a8c6b2824e4312c701ae9a9c5e))
* **inter-protocol:** save psm mintHolder admin facet ([8ab6582](https://github.com/Agoric/agoric-sdk/commit/8ab6582a5514d10d9e603a9a490f3d311419c294))
* **inter-protocol:** save scaledPriceAuthority admin facets ([f65260f](https://github.com/Agoric/agoric-sdk/commit/f65260f1c7b54402cd2639d8dc605c6376ab24a9))
* **oracles:** set min oracles in devnet to 3 ([8c707f8](https://github.com/Agoric/agoric-sdk/commit/8c707f8ffe2c33cb3b48dd6217a8c3b5b50ec576))
* **provisionPool:** metrics publishing path ([bad93e2](https://github.com/Agoric/agoric-sdk/commit/bad93e21dba5b3c82e272bcdb42f26f5bc796389))
* **vats:** IbcATOM -> ATOM ([405ed03](https://github.com/Agoric/agoric-sdk/commit/405ed03b469b6f8bdaa34db392c99949e2a7f248))
* **vats:** loadVat/loadCriticalVat now accepts bundleIDs too ([789091d](https://github.com/Agoric/agoric-sdk/commit/789091dabf3a75164ecc320de4ffe721ba0701dc))
* **vats:** move vat-ibc/vat-network from config to network-proposal.js ([68c8363](https://github.com/Agoric/agoric-sdk/commit/68c8363dea5aa4f2f1846e053ccd68d4e6a9131c)), closes [#7044](https://github.com/Agoric/agoric-sdk/issues/7044)
* **vats:** produce start fns for psm-only bootstrap ([9531af9](https://github.com/Agoric/agoric-sdk/commit/9531af9374ff1aaa7498398e4b5ea8d6f1590c1c))
* bootstrap handles BundleIDs, not full bundles ([de8b0f5](https://github.com/Agoric/agoric-sdk/commit/de8b0f5d35e0938fa00d795d11cfad3acadd9428)), closes [#6826](https://github.com/Agoric/agoric-sdk/issues/6826) [#4374](https://github.com/Agoric/agoric-sdk/issues/4374)
* code updates for new marshal ([292f971](https://github.com/Agoric/agoric-sdk/commit/292f971769db69e61782f96638c2f687c3f95ac2))
* IbcATOM->ATOM in 1 config ([a9efc75](https://github.com/Agoric/agoric-sdk/commit/a9efc753945cd76b34c5583be4c0d5bf746b1d04))
* introduce wallet factory *governor* to econ charter ([02989cf](https://github.com/Agoric/agoric-sdk/commit/02989cf030f3e76667228f1191c6c14be285c623))
* **smart-wallet:** create purses for new assets lazily ([e241ba0](https://github.com/Agoric/agoric-sdk/commit/e241ba03a7d9f441436b3d987f9327060d7dd8ce))
* **smart-wallet:** reenable provisioning options ([55f3ab1](https://github.com/Agoric/agoric-sdk/commit/55f3ab1a0842ae2cc60a05b55e17120e964570b5))
* **vat-provisioning:** bad updater call ([3835198](https://github.com/Agoric/agoric-sdk/commit/38351983836fdf9d3db70312ee39ae9e6a0da7b6))
* **vat-provisioning:** bad updater call ([2f7d5f4](https://github.com/Agoric/agoric-sdk/commit/2f7d5f4620aefea0b5078ca6ca0c2fb09bb54089))
* **vats:** always eventual-send to bridgeManager ([f3a10ce](https://github.com/Agoric/agoric-sdk/commit/f3a10cea0fcf1f26103b5b008b194a29d3208ce0))
* **vats:** prune mints/faucet from prod-like vats config ([74d5f33](https://github.com/Agoric/agoric-sdk/commit/74d5f33afbf81c4f0383632269e606d31003b7f5))
* **vats:** reattach `this` to `publisher.publish` ([575ed1b](https://github.com/Agoric/agoric-sdk/commit/575ed1bd6f78fefe41dca57425daec4c8d2d08ef))
* **vats:** remove duplicate `-` from `icacontroller--2` port ([3d22773](https://github.com/Agoric/agoric-sdk/commit/3d2277357f7be89f281136be274a8ad9385f79af))
* **vats:** repl tolerates toStringTag override ([d748087](https://github.com/Agoric/agoric-sdk/commit/d748087911511151da7aae6794d7191b4fb71283))
* **vats:** tolerate null powerFlags ([140986f](https://github.com/Agoric/agoric-sdk/commit/140986fdadf25ef929145c2e68ad6e11cc33e3e8))
* **vats:** use async chainStorage methods ([0507206](https://github.com/Agoric/agoric-sdk/commit/05072067b28b146c5836a456d5824a63776980b0))
* **vaults:** correct terminology for debt ([e23ad70](https://github.com/Agoric/agoric-sdk/commit/e23ad70e3d02b5fbacdd54d37fe821d03033b9be))
* **zoe:** payments more recoverable ([#7112](https://github.com/Agoric/agoric-sdk/issues/7112)) ([ce7244d](https://github.com/Agoric/agoric-sdk/commit/ce7244d6cf23f57e6de73b5d119e9681456fded7))
* align testnet -> agoric start tooling ([ead89fb](https://github.com/Agoric/agoric-sdk/commit/ead89fb49b4095f326f4bbab52ac79c9dd7d0e2f))
* remove incomplete device-mock method getBundleIDByName ([18763b6](https://github.com/Agoric/agoric-sdk/commit/18763b676ef4f5edc893560a45558374512cb4c8))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* replace zoe.install with zoe.installBundleID ([8a91b1b](https://github.com/Agoric/agoric-sdk/commit/8a91b1b06bf1a62c08156e595cf46f5194f73337)), closes [#6826](https://github.com/Agoric/agoric-sdk/issues/6826)
* swingset should define these types, not zoe/ERTP ([35a977b](https://github.com/Agoric/agoric-sdk/commit/35a977b2fa3c03bd5292718e318a26e897ff3d04))
* update types/dependencies for new @agoric/time ([418545a](https://github.com/Agoric/agoric-sdk/commit/418545ae88085de6e7fde415baa7de0a3f3056a4))


### Miscellaneous Chores

* remove obsolete Treasury ([2819781](https://github.com/Agoric/agoric-sdk/commit/2819781eefc25c90648158575dbe5aff3848fa3f))
* remove storeName parameter ([452f9bc](https://github.com/Agoric/agoric-sdk/commit/452f9bc680d4f54bed5608eb0d7cf67d80d87ba0))
* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



### [0.13.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.13.1...@agoric/vats@0.13.2) (2023-02-17)

**Note:** Version bump only for package @agoric/vats





### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.13.0...@agoric/vats@0.13.1) (2022-12-14)

**Note:** Version bump only for package @agoric/vats





## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.12.1...@agoric/vats@0.13.0) (2022-10-18)


### Features

* anchorAssets config for {USDC,USDT}_{axl,grv} on main ([b938a79](https://github.com/Agoric/agoric-sdk/commit/b938a79f509840c974a89cd621429f2c9dbd9d6e))
* econ committee addresses ([548c096](https://github.com/Agoric/agoric-sdk/commit/548c0968f2e811cf449eddb370bca3448314b06c))
* **vats:** test config doesn't use up production token keywords ([ade318b](https://github.com/Agoric/agoric-sdk/commit/ade318b8055feca9de1d8ee36bf54f64af9f32d5))


### Bug Fixes

* allow test flag for update ([237c56e](https://github.com/Agoric/agoric-sdk/commit/237c56edbf9de28d6947d8f6e482aa554aae02f9))



### [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.12.0...@agoric/vats@0.12.1) (2022-10-08)


### Bug Fixes

* implement upgrade handler ([0f64bf1](https://github.com/Agoric/agoric-sdk/commit/0f64bf15e78e27e7e3127a62740025ab823a4a96))



## [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.11.0...@agoric/vats@0.12.0) (2022-10-05)


### Features

* **vats:** devnet config with anchorAssets, econ cttee addrs ([#6282](https://github.com/Agoric/agoric-sdk/issues/6282)) ([bc883b5](https://github.com/Agoric/agoric-sdk/commit/bc883b5649aa47fff6c6895536d172cf1e9f0e25))


### Bug Fixes

* **provisionPool:** update metrics on trades ([02733eb](https://github.com/Agoric/agoric-sdk/commit/02733eb2e8172ccd2edecab986def027d58601eb))
* **vats:** handle duplicate provision requests ([#6307](https://github.com/Agoric/agoric-sdk/issues/6307)) ([05d405d](https://github.com/Agoric/agoric-sdk/commit/05d405d5409e1f80612bb002234f5a9c3910a7df))



## [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.10.0...@agoric/vats@0.11.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **legacy-smart-wallet:** remove dead package
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **vats:** Switch the "published" chain storage subtree to stream cells
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment)
* **run-protocol:** rename to inter-protocol

### Features

* **board:** `getPublishingMarshaller` and `getReadonlyMarshaller` ([980ac06](https://github.com/Agoric/agoric-sdk/commit/980ac06a4cb31e2b226ffc060828ce6e69109676))
* **bootstrap:** produce testFirstAnchorKit ([219f6fd](https://github.com/Agoric/agoric-sdk/commit/219f6fd3f8fd0fe89372115ad13f4b5e531fba61))
* **cache:** makeChainStorageCoordinator ([a9b8f3e](https://github.com/Agoric/agoric-sdk/commit/a9b8f3ebe4ff3e25c857426781ae5c403198f234))
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment) ([cc4ca9a](https://github.com/Agoric/agoric-sdk/commit/cc4ca9a51665e2d4980ade3f3803655c43ac7001))
* **cosmic-swingset:** Add chainStorage interface ([#5385](https://github.com/Agoric/agoric-sdk/issues/5385)) ([109ff65](https://github.com/Agoric/agoric-sdk/commit/109ff65845caaa503b03e2663437f62e7cdc686e)), closes [#4558](https://github.com/Agoric/agoric-sdk/issues/4558)
* **nameHub:** listen for changes with admin.onUpdate() ([8b4a8af](https://github.com/Agoric/agoric-sdk/commit/8b4a8af7d81fa479017eb3fb78ce04cf841a8930))
* **priceAggregator:** publish quotes ([d4054d9](https://github.com/Agoric/agoric-sdk/commit/d4054d98bd5a094b45ed2e3e70bb1ff997f4b2c5))
* **provision:** govern initial amount; metrics ([f16352d](https://github.com/Agoric/agoric-sdk/commit/f16352d6f3e0935dc035d5c4c1f92e948ade8a10))
* **psm:** far class and guard patterns ([#6119](https://github.com/Agoric/agoric-sdk/issues/6119)) ([11a17d3](https://github.com/Agoric/agoric-sdk/commit/11a17d3cf006cb097d80061234398021109dbd94)), closes [#6129](https://github.com/Agoric/agoric-sdk/issues/6129) [#6135](https://github.com/Agoric/agoric-sdk/issues/6135)
* **smart-wallet:** contract for wallet factory ([57eac62](https://github.com/Agoric/agoric-sdk/commit/57eac62e204dac3001e8e1643fcf04e1cf191071))
* **vats:** Add loadCriticalVat ([d9f1414](https://github.com/Agoric/agoric-sdk/commit/d9f14146d52eef76407dc23f29c79fd22b1c4000))
* **vats:** add provisionPool to agoricNames ([7709e76](https://github.com/Agoric/agoric-sdk/commit/7709e76ab62426d20e15e1e313cff7442d98cf41))
* **vats:** Add support for configuring chainStorage nodes as sequences ([461204a](https://github.com/Agoric/agoric-sdk/commit/461204af30c5437a072d17a1703f3ec02395721b))
* **vats:** better bootstrap errors ([682151a](https://github.com/Agoric/agoric-sdk/commit/682151a13f7d09467c613248880da482cdb91b63))
* **vats:** bootstrap.produceItem(), consumeItem, resetItem ([e2d6ced](https://github.com/Agoric/agoric-sdk/commit/e2d6cede0d087eb059c23506c9dca24c9f47eee5))
* **vats:** facilitate launching additional PSMs ([6bf3164](https://github.com/Agoric/agoric-sdk/commit/6bf3164453f3f4616dfa90d84df14294689b11b8))
* **vats:** handle >1 anchorAssets in boot-psm ([b394bef](https://github.com/Agoric/agoric-sdk/commit/b394bef98efd022205f12f6c991aaf0f0bd17d31))
* **vats:** include startPSMCharter in PSM bootstrap ([7bb593c](https://github.com/Agoric/agoric-sdk/commit/7bb593c5321a27b00cd93bd196c0f822a51411e6))
* **vats:** introduce psmCharter to provisionPool ([3e96944](https://github.com/Agoric/agoric-sdk/commit/3e9694446fbaa90a4aa819df13a3d7772ebdf99d))
* **vats:** makeMockChainStorageRoot test util ([7e48be3](https://github.com/Agoric/agoric-sdk/commit/7e48be3ae25b1dcc77b729e890d5792d8ff36c01))
* **vats:** provisionPool trades provided assets for IST ([e3f9621](https://github.com/Agoric/agoric-sdk/commit/e3f9621f668422490dfce403cbc5d95ec43f0ea7))
* **vats:** start governed provisionPool ([1d100e8](https://github.com/Agoric/agoric-sdk/commit/1d100e8367dcbd553a225b9d9d7b974d46ac0ad2))
* ensure voting via PSMCharter works with a unit test ([#6167](https://github.com/Agoric/agoric-sdk/issues/6167)) ([ff9471b](https://github.com/Agoric/agoric-sdk/commit/ff9471bf3a90ffab050e8b659d64d4cbd7c2d764))
* **vats:** provide essential issuers to smartWallet ([e3774d5](https://github.com/Agoric/agoric-sdk/commit/e3774d5560b75d0036925965564a0011c2c21049))
* **vats:** provide initial IST to new accounts ([aa535f5](https://github.com/Agoric/agoric-sdk/commit/aa535f59633860db0e71491657b7f98eb42f862c))
* **vats:** publishAgoricNames to chainStorage as part of bootstrap ([b41b87d](https://github.com/Agoric/agoric-sdk/commit/b41b87d3367fd97ab2ad386eb632ca9da2e33687))
* **vats:** Switch the "published" chain storage subtree to stream cells ([a427c59](https://github.com/Agoric/agoric-sdk/commit/a427c591e8693b3e33e84462f5af5b7e8d623892)), closes [#5508](https://github.com/Agoric/agoric-sdk/issues/5508)
* **vats:** upgrade to psm-first smart-wallet ([3762fff](https://github.com/Agoric/agoric-sdk/commit/3762fffc987cc1beec2a4417071528d856470de7))
* contract for single on-chain wallet ([0184a89](https://github.com/Agoric/agoric-sdk/commit/0184a89403a3719f21dc61de37865512cdc819ae))
* distribute PSM Charter Invitatitons ([#6166](https://github.com/Agoric/agoric-sdk/issues/6166)) ([50cd3e2](https://github.com/Agoric/agoric-sdk/commit/50cd3e240fb33079948fa03b32bda86276879b4a))
* make PSM bootstrap support multiple brands ([#6146](https://github.com/Agoric/agoric-sdk/issues/6146)) ([d9583f8](https://github.com/Agoric/agoric-sdk/commit/d9583f88fe98eaa16b5d5147f33a99f0722453e1)), closes [#6142](https://github.com/Agoric/agoric-sdk/issues/6142) [#6139](https://github.com/Agoric/agoric-sdk/issues/6139)
* new Smart Wallet ([708972f](https://github.com/Agoric/agoric-sdk/commit/708972f1f531c9ea5e346f833c6d253efe80f837))
* **vats:** PSM-first bootstrap ([2f4110a](https://github.com/Agoric/agoric-sdk/commit/2f4110a3068eeec8fa72e6eea9e42074e860eade))
* **vats:** tag dynamically loaded vats with bundle name ([f016ab8](https://github.com/Agoric/agoric-sdk/commit/f016ab8e04f7e66a900c4c532929b602bc1c4be7))


### Bug Fixes

* **board:** use `SEVERED` instead of `INACCESSIBLE` ([1e6636c](https://github.com/Agoric/agoric-sdk/commit/1e6636cf618f0f05193eb2ef27614df5fe64371b))
* **cosmic-swingset:** Publish installation success and failure topic ([6a9f533](https://github.com/Agoric/agoric-sdk/commit/6a9f533b5b9095768f25b5642e001fd6e9aa8b47))
* **provisionPool:** only provision an account if pool has funds ([52c17e3](https://github.com/Agoric/agoric-sdk/commit/52c17e334d2b4081853515ae7fec7409f2ec87d4))
* **vats:** avoid importing sim-behaviors into boot-psm.js ([356d522](https://github.com/Agoric/agoric-sdk/commit/356d522486947b9d6bcf0430180af0b290afd3eb))
* **vats:** chainStorage vat writes directly to device ([bfacc92](https://github.com/Agoric/agoric-sdk/commit/bfacc92cbc7095b3c286876f71a46a0f64418ad1))
* **vats:** economicCommitteeAddresses {} update ([3964caa](https://github.com/Agoric/agoric-sdk/commit/3964caa9c892f16624a858a10ff95e748b5730ee)), closes [#6168](https://github.com/Agoric/agoric-sdk/issues/6168)
* **vats:** ensure rejections from loadVat are caught ([bb9eb9c](https://github.com/Agoric/agoric-sdk/commit/bb9eb9c99378a2c5b59109b73a2772c5f089e605))
* **vats:** Fix test failures ([26b2a60](https://github.com/Agoric/agoric-sdk/commit/26b2a60044a968f5317078dd24ac00bc1465eca2))
* **vats:** Mark bootstrap vats as critical ([55ca7a0](https://github.com/Agoric/agoric-sdk/commit/55ca7a0602f417fd811106a03d05ecb08b412e92))
* **vats:** point to @agoric/smart-wallet/src/walletFactory.js ([50ff847](https://github.com/Agoric/agoric-sdk/commit/50ff847acc46c6c729de699f04daea8fff05ad6c))
* **vats:** propagate error from PSM bootstrap ([0c8ab04](https://github.com/Agoric/agoric-sdk/commit/0c8ab043a6f1231809203a59bbcf57f1cee37c8e))
* **vats:** snapshot 5x less often ([723cf42](https://github.com/Agoric/agoric-sdk/commit/723cf422892e8e847c312e148d58c85c41f18b6b))
* add a defaultReapInterval setting to active swingset configurations ([4f4ab5b](https://github.com/Agoric/agoric-sdk/commit/4f4ab5b436dd763a73c6a47250ed6a7831471e33)), closes [#4160](https://github.com/Agoric/agoric-sdk/issues/4160)
* Fix test failures in packages other than "vats" ([364815b](https://github.com/Agoric/agoric-sdk/commit/364815b88429e3443734681b5b0771b7d824ebe8))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **vats:** Replace loadVat calls with loadCriticalVat ([2ec0b83](https://github.com/Agoric/agoric-sdk/commit/2ec0b83470e8ab74adf0c6476dbc20a6160cbac0)), closes [#6051](https://github.com/Agoric/agoric-sdk/issues/6051)
* patch to suppress turn tracking diagnostics ([#5892](https://github.com/Agoric/agoric-sdk/issues/5892)) ([18cfe7a](https://github.com/Agoric/agoric-sdk/commit/18cfe7a5e2d80434dfc37ea3175d23b32b34fbc7))
* SMART_WALLET account flag for smart wallet vs. ag-solo client ([#5806](https://github.com/Agoric/agoric-sdk/issues/5806)) ([8ed0d70](https://github.com/Agoric/agoric-sdk/commit/8ed0d701b9073ff039618c0a2e3c6b04acd60177))
* **vats:** update `chainStorage` to use new `vstorage` API ([094044c](https://github.com/Agoric/agoric-sdk/commit/094044c6e75203a47d069242cfa225b2c15d80d5))
* **walletFactory:** marshal using petnames ([#5743](https://github.com/Agoric/agoric-sdk/issues/5743)) ([5d49ad7](https://github.com/Agoric/agoric-sdk/commit/5d49ad79947f44a7cbe98d232ecde105223763d5))


### Code Refactoring

* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)


### Miscellaneous Chores

* **legacy-smart-wallet:** remove dead package ([bb56ce8](https://github.com/Agoric/agoric-sdk/commit/bb56ce8ed0556949c5e434734cedf113ae649fdb))



## [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.9.0...@agoric/vats@0.10.0) (2022-05-28)


### Features

* **cosmic-swingset:** implement `make scenario2-run-chain-economy` ([82a6ee9](https://github.com/Agoric/agoric-sdk/commit/82a6ee9edba0eec562e12bd325b893010ddb94ce))
* **feeDistributor:** new `run-protocol` Zoe contract ([b5d9869](https://github.com/Agoric/agoric-sdk/commit/b5d9869049e42319d8df529bc274e487e77493ad))
* **nameHub:** introduce `default` and `set` ([e7437f2](https://github.com/Agoric/agoric-sdk/commit/e7437f2d17595c26444dfa3b28e2dfb25a348ff8))
* **vats:** decentral-economy-config to launch full economy at bootstrap ([ed49ed9](https://github.com/Agoric/agoric-sdk/commit/ed49ed9d9aa594de3018887280856f0b80712c54))
* **vats:** separate reserve and reward streams ([8303c97](https://github.com/Agoric/agoric-sdk/commit/8303c9750b7ea2e3c455d0ba155d806563507bbc))


### Bug Fixes

* **nameHub:** align implementation with types ([fcb1b2a](https://github.com/Agoric/agoric-sdk/commit/fcb1b2a3d8c1c20fd9a3b4a249c5a23e2a89a822))
* **vats:** make core config location independent ([9612d59](https://github.com/Agoric/agoric-sdk/commit/9612d591a4c58cf447f46e085f81dd0762b46d4a))
* **vats:** store results of createVatByName for zoe etc. ([d991a55](https://github.com/Agoric/agoric-sdk/commit/d991a55ba808864d8ec287cc7436e183a8d43829)), closes [#5013](https://github.com/Agoric/agoric-sdk/issues/5013)



## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.8.0...@agoric/vats@0.9.0) (2022-05-09)


### Features

* **vats:** export AssetTerms type from mintHolder.js ([cfd5648](https://github.com/Agoric/agoric-sdk/commit/cfd5648f883ddcecb87d6a8743e7c034de1e18e6))


### Bug Fixes

* **basic-behaviours:** assign `home.priceAuthority` ([7afa292](https://github.com/Agoric/agoric-sdk/commit/7afa29200819f35043fdbbd6bccc09cc74b5a5c7))
* **centralSupply:** shutdown after providing bootstrap payment ([823dda0](https://github.com/Agoric/agoric-sdk/commit/823dda012f2a07ec7caf9742dea261ef78c1091a))
* **chain-behaviors:** propagate `VatData` to `endowments` ([e9ed050](https://github.com/Agoric/agoric-sdk/commit/e9ed0508e3c10f2ab582b044b8f6ac50f0e9c969))
* **chain-behaviors:** use endowments consistently ([166ffd5](https://github.com/Agoric/agoric-sdk/commit/166ffd51bb49a27b0f10e85cca358e7ff1074df2))



## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.7.0...@agoric/vats@0.8.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* add collateral Reserve to hold collateral and add to AMM under governance control (#4635)
* consistent Node engine requirement (>=14.15.0)

### Features

* **boot:** keep ahold of `agoricNamesAdmin` ([ed34cdb](https://github.com/Agoric/agoric-sdk/commit/ed34cdb0dda0bd0059f5f8659d680fc4b81c9a45))
* **build-bundles:** create source bundles with helper ([732292a](https://github.com/Agoric/agoric-sdk/commit/732292acf817ab774dea3d15209c0b5a2b2e326d))
* **cosmic-swingset:** grant addVaultType based on addr ([#4641](https://github.com/Agoric/agoric-sdk/issues/4641)) ([e439024](https://github.com/Agoric/agoric-sdk/commit/e439024788f27ea668b2ff0c5e486ab901807eb0))
* **deploy-script-support:** shell out to `bundle-source` ([18e8c88](https://github.com/Agoric/agoric-sdk/commit/18e8c88223da0f4ef6998e0bc0e39a7979dd317b))
* **deploy-script-suppport:** e2e `writeCoreProposal` ([88a0cf7](https://github.com/Agoric/agoric-sdk/commit/88a0cf70c9078f0e9e2c46a6cc30bcb736e6e379))
* **run-protocol:** charge penalty for liquidation ([#4996](https://github.com/Agoric/agoric-sdk/issues/4996)) ([5467be4](https://github.com/Agoric/agoric-sdk/commit/5467be4fb5c4cc47f34736eb669e207b26eb711d))
* **run-protocol:** debtLimit governed param ([#4948](https://github.com/Agoric/agoric-sdk/issues/4948)) ([161e968](https://github.com/Agoric/agoric-sdk/commit/161e9689ea13fae8559a8915a87a5ec031969d5f))
* **run-protocol:** RUNstake contract only, without payoff from rewards ([#4741](https://github.com/Agoric/agoric-sdk/issues/4741)) ([52f60eb](https://github.com/Agoric/agoric-sdk/commit/52f60eb192217ff3e4cf84a5a2ff8ada19fb5dcc))
* **vats:** add `lookup(...path)` to board ([df8fee0](https://github.com/Agoric/agoric-sdk/commit/df8fee0d31b09febbf6279cf5ea022e25d8310d4))
* **vats:** add evaluateInstallation to bootstrap powers ([4306ac9](https://github.com/Agoric/agoric-sdk/commit/4306ac90193a71651ff767021512e09fb20770bf))
* **vats:** allow `nameAdmin.update` to specify a subadmin ([fb9c51b](https://github.com/Agoric/agoric-sdk/commit/fb9c51b25effbc2e3bb5ef7f0b5376daa4da71bb))
* **vats:** control whether `producer.reset` rejects the consumer promise ([611f75c](https://github.com/Agoric/agoric-sdk/commit/611f75c4c73ecbdb812a34020d92e648f899b8d2))
* **vats:** introduce `'oracleBrand'` ([4f3f5e0](https://github.com/Agoric/agoric-sdk/commit/4f3f5e00da0fafde76b0fe49c0444c0f863ea3a2))
* **vats:** make `NameHub` accessible via `NameAdmin.readonly()` ([67fc609](https://github.com/Agoric/agoric-sdk/commit/67fc60952139704220af830485a52b6cadc328dc))
* **vats:** make default board IDs be `board0{crc}${sequence}` ([2d2de8c](https://github.com/Agoric/agoric-sdk/commit/2d2de8c1c5e9c946417f7e01a66272ed39e19d23))
* **vats:** move BLD mint, issuer to its own vat ([0acce28](https://github.com/Agoric/agoric-sdk/commit/0acce288f9222fa602f634214fa59b673ce7f64a)), closes [#4578](https://github.com/Agoric/agoric-sdk/issues/4578)
* **vats:** pass options thru runBehaviors ([72d1f8d](https://github.com/Agoric/agoric-sdk/commit/72d1f8d6c565ca889b25f04d562a0a12c0f51754))
* **vats:** remove pegasus from bootstrap ([c384a41](https://github.com/Agoric/agoric-sdk/commit/c384a41c6e494059beb28c09a94e5625faa5f87e))
* **vats:** support `coreProposals` ([b45e5c6](https://github.com/Agoric/agoric-sdk/commit/b45e5c609dc2e861ab1ed32508917f7c97d8ad9f))
* **virtual-purse:** use a `recoveryPurse` to track payments ([959ed31](https://github.com/Agoric/agoric-sdk/commit/959ed31ff7e7f9b868fd4ebfca7743fa2b8496af))
* add collateral Reserve to hold collateral and add to AMM under governance control ([#4635](https://github.com/Agoric/agoric-sdk/issues/4635)) ([3e3f55f](https://github.com/Agoric/agoric-sdk/commit/3e3f55f48365d614c2215d8f311f973ff54b6cd0)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188) [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)


### Bug Fixes

* **core-boot:** complain louder if bootstrap fails ([b6dd4fc](https://github.com/Agoric/agoric-sdk/commit/b6dd4fc9a83bc5d73801443c62c153fed1c35af8))
* **core-boot:** only endow evaluateInstallation` if permitted ([50a1156](https://github.com/Agoric/agoric-sdk/commit/50a11561b1f7bcd1c8be452b93aee363e267a4a0))
* **eventual-send:** correct types for ERef ([d23c425](https://github.com/Agoric/agoric-sdk/commit/d23c42536044b1b6aa7113d21014661f1b22ccb5))
* **run-protocol:** shuffle around to fix types ([1c06bbd](https://github.com/Agoric/agoric-sdk/commit/1c06bbd71c39b09bb0e8007b0a96febf3bfbd771))
* **vats:** core eval: evaluation errors were not logged ([9288e55](https://github.com/Agoric/agoric-sdk/commit/9288e556d335594c6b7c51135adb738d3e995816))
* **vats:** make tests work with new bundlecaps ([fc55adc](https://github.com/Agoric/agoric-sdk/commit/fc55adc627d4356f4b12dd423543516a3c1050f5))
* **vats:** move `startPriceAuthority` earlier in the boot sequence ([bf93171](https://github.com/Agoric/agoric-sdk/commit/bf93171c69eb1a19b04c24c9283e0d433ca9d411))
* **vats:** provide proper zcfSpec.name when building zoe ([1a8a54d](https://github.com/Agoric/agoric-sdk/commit/1a8a54dcbc86df4134d4f7419751b719884828a5))
* **vats:** reimplement and test `PromiseSpace.reset` ([e196144](https://github.com/Agoric/agoric-sdk/commit/e1961446c1e903384ef3bc392fcd728f6d7aa934))
* **vats:** reserve `centralSupply` and `mintHolder` installs ([5873d41](https://github.com/Agoric/agoric-sdk/commit/5873d4167c0b4d508697ffcdd372eb385e58ff29))
* **vats:** update swingset deep-import paths ([a1f88c9](https://github.com/Agoric/agoric-sdk/commit/a1f88c9138fdcdb1f512971fd9b8fd8fbc2d972c))
* **vats:** use `decentral-*-config.json` to bundle Zoe contracts ([125e9ba](https://github.com/Agoric/agoric-sdk/commit/125e9ba1721a503ba4314f45858737c0e273fc8f))
* correct bugs due to weird & mistaken buildRootObject usage ([990e7d8](https://github.com/Agoric/agoric-sdk/commit/990e7d88a5c24bb077f349517139c8aa2d5f536a))
* freeze globalThis in coreEval to enforce OCap discipline ([02f401f](https://github.com/Agoric/agoric-sdk/commit/02f401f7eb338d8467464a4b021c01f77518a22d)), closes [#4642](https://github.com/Agoric/agoric-sdk/issues/4642) [#4352](https://github.com/Agoric/agoric-sdk/issues/4352)
* recover stuck payments ([2e366cb](https://github.com/Agoric/agoric-sdk/commit/2e366cbbd447c0117f66bb740b05d2a1b4e82f33))
* remove purse.claim per review comment ([e68ce40](https://github.com/Agoric/agoric-sdk/commit/e68ce40cb019f82b21ec623761a1df3cd68c27f2))
* two isolated cases where a missing argument did not default ([531d367](https://github.com/Agoric/agoric-sdk/commit/531d367600e97652babff1ee8ffa4e4665f50baa))
* **vats:** second argument to `makeBoard` is `opts` ([e4ac8d4](https://github.com/Agoric/agoric-sdk/commit/e4ac8d4de7e8ead7047c204bfa51ed431955e828))
* **zoe:** pass brands (not issuers) to priceAggregator ([5800711](https://github.com/Agoric/agoric-sdk/commit/580071189bb60d83ceaa806bf85035173ae9563c))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.6.0...@agoric/vats@0.7.0) (2022-02-24)


### ⚠ BREAKING CHANGES

* **vats:** decentral-config.json config file is no longer
available. Use decentral-core-config.js, which starts core
services by not RUN protocol etc., or decentral-demo-config.js,
which does start the RUN protocol and provides demo funds in
wallets, AMM.

### Features

* **cosmic-swingset:** add tools for core-eval governance ([7368aa6](https://github.com/Agoric/agoric-sdk/commit/7368aa6c22be840733843b1da125eb659cc21d84))
* **vats:** pass some module namespaces to core eval ([7b063db](https://github.com/Agoric/agoric-sdk/commit/7b063dbc5894657035cd654b7d0cca01475463d5))
* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)
* **vats:** core bootstrap behaviors: addBankAssets, ... ([613aff6](https://github.com/Agoric/agoric-sdk/commit/613aff68d1a40ef277871e29879db3b2c807358d))
* **vats:** demo bootstrap behaviors: connectFaucet, fundAMM ([b6776ab](https://github.com/Agoric/agoric-sdk/commit/b6776abd9224bc006b93223b93314b0f7d4c0279))
* **vats:** reserve depositFacet for each client ([806ed5a](https://github.com/Agoric/agoric-sdk/commit/806ed5a4dfc3160570250f4b1ef5ff5cc8d1bdcf))


### Bug Fixes

* **vats:** don't dup / clobber client/home properties ([9ddf290](https://github.com/Agoric/agoric-sdk/commit/9ddf290668c5ecfbdb8337834eaf6f48d30b638a))
* **vats:** parse coreEval permits correctly ([eb04df5](https://github.com/Agoric/agoric-sdk/commit/eb04df554dc9f052724925b13690d7b508a05031))
* **vats:** prune bootstrap config that mixed prod with test/demo ([d90251d](https://github.com/Agoric/agoric-sdk/commit/d90251d83f9324635f40a823a728e734ea0c4bbc)), closes [#4165](https://github.com/Agoric/agoric-sdk/issues/4165)
* **vats:** reserve Treasury uiConfig for compatibility ([943fba5](https://github.com/Agoric/agoric-sdk/commit/943fba55794f54adb13296ef163e898d6942c4be))
* **vats:** reserve: is noop if key already exists (NEEDSTEST) ([668ef1e](https://github.com/Agoric/agoric-sdk/commit/668ef1ef960ba68bd7e031d298d826d3856d1277))



## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.5.1...@agoric/vats@0.6.0) (2022-02-21)


### ⚠ BREAKING CHANGES

* **vats:** use `pegasus` port for Pegasus implementation

### Features

* **ibc:** reimplement `relativeTimeoutNs`, per `ibc-go` ([4673493](https://github.com/Agoric/agoric-sdk/commit/4673493df11f51e9aa018b0ded9632776759f1ee))
* **pegasus:** properly abort on connection close ([1b17f7a](https://github.com/Agoric/agoric-sdk/commit/1b17f7aa4de11ccd5a1ec26fc7b6fff017d70ac1))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))
* **vats:** add attestationMaker to home (WIP) ([ad5501b](https://github.com/Agoric/agoric-sdk/commit/ad5501b9fd52b805964b945487963c9ef1b3664a))
* **vats:** agoricNames, namesByAddress, myAddressNameAdmin ([4535c8d](https://github.com/Agoric/agoric-sdk/commit/4535c8da8db373022a9837fabbae12abf16af196))
* **vats:** assign client properties on a per-address basis ([48194ed](https://github.com/Agoric/agoric-sdk/commit/48194ed4dc3584870e95237c79eec7efc5c352b6))
* **vats:** boostrap-core connects vattp<->mailbox (WIP) ([2be2939](https://github.com/Agoric/agoric-sdk/commit/2be2939dc648988e7a8d7fdb7db9c7334c285f40))
* **vats:** build Zoe as bootstrap step ([bb8d0a8](https://github.com/Agoric/agoric-sdk/commit/bb8d0a8ab308c0f6cd1a0eec4fabe39db5463353))
* **vats:** choose bootstrap behaviors by name ([13627b2](https://github.com/Agoric/agoric-sdk/commit/13627b2e3698e879677d136ccfacff9086bd4c2c))
* **vats:** connectFaucet bootstrap behavior ([9e53f4f](https://github.com/Agoric/agoric-sdk/commit/9e53f4f6bcc5d19cabe1e44dea2e9f8bb374e475))
* **vats:** Cosmos chain core bootstrap with ag-solo client ([a4ab506](https://github.com/Agoric/agoric-sdk/commit/a4ab5062fb5e50026772d82504fcaeb8e2bc76d4))
* **vats:** demo-config to install economy automatically ([a948b16](https://github.com/Agoric/agoric-sdk/commit/a948b169ff754e3df3c9b07f1f7a71e2c7abbf99))
* **vats:** in sim-chain, delegate economy bootstrap to REPL user ([116ccbd](https://github.com/Agoric/agoric-sdk/commit/116ccbdf3f04b41357458c2384d2d08e2798ba34))
* **vats:** installSimEgress ([a438f47](https://github.com/Agoric/agoric-sdk/commit/a438f4721a1f45419c692f92be3e33251c67307c))
* **vats:** makeBLDKit ([4dac138](https://github.com/Agoric/agoric-sdk/commit/4dac138f4c78df7e67768e50a73ffad2b938d678))
* **vats:** makeBoard in core bootstrap ([af1b920](https://github.com/Agoric/agoric-sdk/commit/af1b920531988dbd5117c2e0ed51893e9fdb5a8e))
* **vats:** produce priceAuthorityAdmin from startVaultFactory ([29f6324](https://github.com/Agoric/agoric-sdk/commit/29f63245a8308599e2e021ef04ba930fd9dc51e1))
* **vats:** provide home.zoe via makePromiseSpace ([a50c727](https://github.com/Agoric/agoric-sdk/commit/a50c7270b52f3d4d07c23152fce5c473c6082850))
* **vats:** provide noop agoric.faucet in local-chain ([5c990a3](https://github.com/Agoric/agoric-sdk/commit/5c990a3fbcffef79b041b3c495fc5b116af95954))
* **vats:** put RUN, BLD issuer, brand in agoricNames ([3c9eef2](https://github.com/Agoric/agoric-sdk/commit/3c9eef20ce8819cd5e3307b65f67c7a318c1f984))
* **vats:** start attestation contract (WIP) ([1c44623](https://github.com/Agoric/agoric-sdk/commit/1c44623692920d4cf24354a1f7251baa76813952))
* **vats:** start getRUN protocol ([2c97f86](https://github.com/Agoric/agoric-sdk/commit/2c97f8673ba8c3160da6a0d2cc0d7ad6b2c6881a))
* **vats:** start VaultFactory in core bootstrap ([8d56eaf](https://github.com/Agoric/agoric-sdk/commit/8d56eaf797f37d9ded23b34b68599a57681290a5))
* **vats:** visualize bootstrap (WIP) ([2489f1d](https://github.com/Agoric/agoric-sdk/commit/2489f1d8b1dfedfed75a3bb7a3dac0eeab165bed))


### Bug Fixes

* **vats:** improved IBC network protocol ([0cd94c3](https://github.com/Agoric/agoric-sdk/commit/0cd94c3dc1147f7aaa9a15c23991e448ae253891))
* **vats:** use `pegasus` port for Pegasus implementation ([4256c54](https://github.com/Agoric/agoric-sdk/commit/4256c5447d3d3ab9a8c8db8e4250e1c41a96c56d))
* Enhance TypeScript node_modules search depth ([113d31b](https://github.com/Agoric/agoric-sdk/commit/113d31b2ea12c48546218c6bc8d86c8620d9036c))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* **vats:** buildDistributor call; refactor bootstrap.js ([d854298](https://github.com/Agoric/agoric-sdk/commit/d854298aaa227c0fea1791adb039677ab4aabcaa)), closes [#1](https://github.com/Agoric/agoric-sdk/issues/1)
* **vats:** ensure `nameHub` API returns arrays ([fac4476](https://github.com/Agoric/agoric-sdk/commit/fac4476caf85f4eac1555e20b6285da7df41a375))
* **vats:** fix lint problems ([ce94710](https://github.com/Agoric/agoric-sdk/commit/ce947104773be94335ef1394e7bc79fbfd7f5027))
* **vats:** get `configuration.clientHome` updates to `agoric` ([c50248e](https://github.com/Agoric/agoric-sdk/commit/c50248e74e77cc6f62a7a849b90b239548d9c49d))
* **vats:** minor adjustments to legacy bootstrap ([877f30a](https://github.com/Agoric/agoric-sdk/commit/877f30aea8f782254157946750fd3b0a6b79b316))
* **vats:** move to `decentral-core-config.json` to prevent breakage ([63c7541](https://github.com/Agoric/agoric-sdk/commit/63c754147da870d8d73f847545e25856610f7300))
* **vats:** unstaked BLD should not be a vault collateral type ([1d24556](https://github.com/Agoric/agoric-sdk/commit/1d2455676ff0499eaa442c1fc9cd53fb923ef66e))



### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.5.0...@agoric/vats@0.5.1) (2021-12-22)

**Note:** Version bump only for package @agoric/vats





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.4.2...@agoric/vats@0.5.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **repl:** add `@endo/far` exports to REPL, remove `ui-agent`
* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Features

* **repl:** add `@endo/far` exports to REPL, remove `ui-agent` ([3f41296](https://github.com/Agoric/agoric-sdk/commit/3f41296865dadbf7d7fe50291b86d972bc3caabd))
* tweak fictional BLD price to suggest early phase ([472912e](https://github.com/Agoric/agoric-sdk/commit/472912e507a4d83b41734b9110e3127b1bd40755))
* **walletManager:** enable `agoric.chainWallet` deployment power ([93b290b](https://github.com/Agoric/agoric-sdk/commit/93b290b6eb3db3bdf36116e4f78907091e5b9d24))


### Bug Fixes

* **wallet:** allow sync `dateNow` via timerService or timerDevice ([8b6069a](https://github.com/Agoric/agoric-sdk/commit/8b6069aa4100f3c1f2c5ec9a098243913dd8b066))


### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.4.1...@agoric/vats@0.4.2) (2021-10-13)


### Bug Fixes

* **vats:** Fork polycrc for ESM compat with Endo/Zip ([6d9df0e](https://github.com/Agoric/agoric-sdk/commit/6d9df0e482c2cae3fd52a06fa166f78e0b44b90d))



### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.4.0...@agoric/vats@0.4.1) (2021-09-23)


### Features

* **solo:** make client objects appear earlier, parallelise chain ([656514e](https://github.com/Agoric/agoric-sdk/commit/656514e5937389c57e139bc1302fa435edd2e674))



## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.3.2...@agoric/vats@0.4.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* **issuers:** clean up issuers for demo

### Features

* **issuers:** clean up issuers for demo ([228cf1a](https://github.com/Agoric/agoric-sdk/commit/228cf1a80d100e653460823cae62fdd547447cb3))


### Bug Fixes

* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))



### [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.3.1...@agoric/vats@0.3.2) (2021-08-21)

**Note:** Version bump only for package @agoric/vats





### [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.3.0...@agoric/vats@0.3.1) (2021-08-18)

**Note:** Version bump only for package @agoric/vats





## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.15...@agoric/vats@0.3.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Features

* create feePurse in bootstrap and import to wallet ([4e9d5b0](https://github.com/Agoric/agoric-sdk/commit/4e9d5b0980cae94fdf6d8f78445da5282cbd974f))
* **cosmic-swingset:** provide RUN for sim-chain ([6d27815](https://github.com/Agoric/agoric-sdk/commit/6d2781520b1987c0a9529b300c3a368c09557ee9)), closes [#3266](https://github.com/Agoric/agoric-sdk/issues/3266)


### Bug Fixes

* threshold must be a bigint ([102da87](https://github.com/Agoric/agoric-sdk/commit/102da874e9c62fb4a0acbad208445ffd9b68f0a3))
* **vats:** properly wire in the Zoe kit ([4b926e8](https://github.com/Agoric/agoric-sdk/commit/4b926e86b6d3814fb8e91bc83c1dd91be29cab83))
* **wallet:** never fail to suggestPetname ([dd4fbc1](https://github.com/Agoric/agoric-sdk/commit/dd4fbc166565e7ba1f1a0c06f513570305acefe7))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.2.15](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.14...@agoric/vats@0.2.15) (2021-08-16)

**Note:** Version bump only for package @agoric/vats





### [0.2.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.11...@agoric/vats@0.2.14) (2021-08-15)


### Bug Fixes

* Update packages/vats/src/ibc.js ([d6d5ae2](https://github.com/Agoric/agoric-sdk/commit/d6d5ae2c7517dad53439d7f14f32a0b760b52fa1))
* **vats:** vat-ibc must use LegacyMap, not Store, to hold a Set ([2479017](https://github.com/Agoric/agoric-sdk/commit/2479017af56a352574a3fba4027a055b15336a75)), closes [#3621](https://github.com/Agoric/agoric-sdk/issues/3621)
* Add zcf extensions ([862aefe](https://github.com/Agoric/agoric-sdk/commit/862aefe17d0637114aee017be79a84dbcacad48d))

### 0.26.10 (2021-07-28)


### Features

* improve ag-solo robustness and performance ([b101d3a](https://github.com/Agoric/agoric-sdk/commit/b101d3a4cd4fc97c4a6c794877efc47d43b12f02))



### [0.2.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.11...@agoric/vats@0.2.13) (2021-08-14)


### Bug Fixes

* Update packages/vats/src/ibc.js ([d6d5ae2](https://github.com/Agoric/agoric-sdk/commit/d6d5ae2c7517dad53439d7f14f32a0b760b52fa1))
* **vats:** vat-ibc must use LegacyMap, not Store, to hold a Set ([2479017](https://github.com/Agoric/agoric-sdk/commit/2479017af56a352574a3fba4027a055b15336a75)), closes [#3621](https://github.com/Agoric/agoric-sdk/issues/3621)
* Add zcf extensions ([862aefe](https://github.com/Agoric/agoric-sdk/commit/862aefe17d0637114aee017be79a84dbcacad48d))

### 0.26.10 (2021-07-28)


### Features

* improve ag-solo robustness and performance ([b101d3a](https://github.com/Agoric/agoric-sdk/commit/b101d3a4cd4fc97c4a6c794877efc47d43b12f02))



### [0.2.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.11...@agoric/vats@0.2.12) (2021-07-28)


### Features

* improve ag-solo robustness and performance ([b101d3a](https://github.com/Agoric/agoric-sdk/commit/b101d3a4cd4fc97c4a6c794877efc47d43b12f02))



### [0.2.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.10...@agoric/vats@0.2.11) (2021-07-01)


### Bug Fixes

* retreat from `xs-worker-no-gc` to `xs-worker` ([ce5ce00](https://github.com/Agoric/agoric-sdk/commit/ce5ce00c6a07d59ee249bfd736a3d5a66c8b903f))



### [0.2.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.9...@agoric/vats@0.2.10) (2021-07-01)

**Note:** Version bump only for package @agoric/vats





### [0.2.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.8...@agoric/vats@0.2.9) (2021-06-28)

**Note:** Version bump only for package @agoric/vats





### [0.2.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.7...@agoric/vats@0.2.8) (2021-06-25)


### Features

* **swingset:** introduce 'xs-worker-no-gc' for forward compat ([e46cd88](https://github.com/Agoric/agoric-sdk/commit/e46cd883449c02559e2c0c49b66e26695b4b99da))



### [0.2.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.6...@agoric/vats@0.2.7) (2021-06-24)


### Bug Fixes

* maybe the best of both worlds: xs-worker but no explicit gc() ([8d38e9a](https://github.com/Agoric/agoric-sdk/commit/8d38e9a3d50987cd21e642e330d482e6e733cd3c))



### [0.2.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.5...@agoric/vats@0.2.6) (2021-06-24)


### Bug Fixes

* use 'local' worker, not xsnap, on both solo and chain ([a061a3e](https://github.com/Agoric/agoric-sdk/commit/a061a3e92f4ab90d293dfb5bff0223a24ed12d87)), closes [#3403](https://github.com/Agoric/agoric-sdk/issues/3403)



### [0.2.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.4...@agoric/vats@0.2.5) (2021-06-23)

**Note:** Version bump only for package @agoric/vats





### [0.2.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.3...@agoric/vats@0.2.4) (2021-06-16)

**Note:** Version bump only for package @agoric/vats





### [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.2...@agoric/vats@0.2.3) (2021-06-15)


### Features

* create a feeCollectorDepositFacet ([60f7ea0](https://github.com/Agoric/agoric-sdk/commit/60f7ea0b3fc9f12a8192284695e7c454833ced15))
* tackle the [@erights](https://github.com/erights) challenge ([d4b8d34](https://github.com/Agoric/agoric-sdk/commit/d4b8d343bbf4cb39237f2e6901bf02cf7ca51a57))
* use feeCollectorDepositFacet ([7e97cc1](https://github.com/Agoric/agoric-sdk/commit/7e97cc1e86ae5b4bf35ae5cb592529bffdf2658c))
* **repl:** better stringification of Symbols ([658cf1b](https://github.com/Agoric/agoric-sdk/commit/658cf1b6a5e330b9d3fddf0a2b3ee8242614d373))


### Bug Fixes

* have supplyCoins decide amount to escrow for the bank purses ([c7cba64](https://github.com/Agoric/agoric-sdk/commit/c7cba64ccbead69ea74920b5bfbf7d7a17cd0e9b))
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* remove references to @agoric/babel-parser ([e4b1e2b](https://github.com/Agoric/agoric-sdk/commit/e4b1e2b4bb13436ef53f055136a4a1d5d933d99e))
* **repl:** render the unjsonable things described in [#2278](https://github.com/Agoric/agoric-sdk/issues/2278) ([bef7d37](https://github.com/Agoric/agoric-sdk/commit/bef7d3746c1ba03fa95ac9c696d602e88ad05f6d))
* remove references to @agoric/registrar ([ec6cc6d](https://github.com/Agoric/agoric-sdk/commit/ec6cc6d8f1da9ec5a38420b501562eaebfbdc76c))



## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.1...@agoric/vats@0.2.2) (2021-05-10)


### Bug Fixes

* simplify scheduling in distributeFees ([#3051](https://github.com/Agoric/agoric-sdk/issues/3051)) ([eb6b8fe](https://github.com/Agoric/agoric-sdk/commit/eb6b8fe5fd6013e854b81198916d13a333e8ab59)), closes [#3044](https://github.com/Agoric/agoric-sdk/issues/3044)
* update AMM liquidity ([56884f1](https://github.com/Agoric/agoric-sdk/commit/56884f19ca95df4586880afa717d06d09a5d5c1b))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vats@0.2.0...@agoric/vats@0.2.1) (2021-05-05)

**Note:** Version bump only for package @agoric/vats





# 0.2.0 (2021-05-05)


### Bug Fixes

* add brand to `depositMultiple` mock bank ([0d1f22d](https://github.com/Agoric/agoric-sdk/commit/0d1f22d2f091ccf330428a1573e0043820b21ac2))
* polishing touches ([334a253](https://github.com/Agoric/agoric-sdk/commit/334a253c02dc1c74117237f6ae18b31505e635af))
* remove awaita from `depositMultiple` ([a7da714](https://github.com/Agoric/agoric-sdk/commit/a7da714e54f2c6e2427ac44c26e5c359ebde92aa))
* update types and implementation now that Far preserves them ([a4695c4](https://github.com/Agoric/agoric-sdk/commit/a4695c43a09abc92a20c12104cfbfefb4cae2ff2))


### Features

* add bank assets for "cosmos" issuers (currently BLD) ([3148b83](https://github.com/Agoric/agoric-sdk/commit/3148b8337db517e0908b07df93c9b7d497ddcf40))
* add home.bank and home.bankManager ([276a1d3](https://github.com/Agoric/agoric-sdk/commit/276a1d3eb28fe83b1f59ca329e645aa1e9686849))
* default to xs-worker in chain ([#2995](https://github.com/Agoric/agoric-sdk/issues/2995)) ([7ebb5d8](https://github.com/Agoric/agoric-sdk/commit/7ebb5d8dac86662e167ff0333cc655bd511d2c58))
* donate RUN from the bootstrap payment on each provision ([43c5db5](https://github.com/Agoric/agoric-sdk/commit/43c5db5d819a3be059a5ead074aa96c3d87416c4))
* first cut at a virtual purse API ([0c46a9d](https://github.com/Agoric/agoric-sdk/commit/0c46a9ddacbb5b06217104414ebd4cca6cb2e410))
* handle VPURSE_BALANCE_UPDATE as return value from GIVE/GRAB ([6e62c24](https://github.com/Agoric/agoric-sdk/commit/6e62c244b2e1c07fbcfca8e4882ff9c1135f457e))
* have the bank use normal purses when not on chain ([90ab888](https://github.com/Agoric/agoric-sdk/commit/90ab888c5cdc71a2322ca05ad813c6411c876a74))
* implement vat-bank and test ([e7c342a](https://github.com/Agoric/agoric-sdk/commit/e7c342aa27b6d4090e4f9f922637d5621c35a9a5))
* wire up vats.distributeFees ([9e16332](https://github.com/Agoric/agoric-sdk/commit/9e163327602fad3a6ba3264c7fa29c02e07af765))
* **vats:** fully-working decentral services ([3525283](https://github.com/Agoric/agoric-sdk/commit/3525283edb8f24718f35c942684ec2feca8ebbb7))
* **vpurse:** connect to golang ([d2f719d](https://github.com/Agoric/agoric-sdk/commit/d2f719dce9936a129817a3781bc1de8c4367bb46))
