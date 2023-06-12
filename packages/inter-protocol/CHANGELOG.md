# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.16.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.16.0...@agoric/inter-protocol@0.16.1) (2023-06-09)

**Note:** Version bump only for package @agoric/inter-protocol





## [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.15.0...@agoric/inter-protocol@0.16.0) (2023-06-02)


### ⚠ BREAKING CHANGES

* **price:** rm deprecated getRoundStartNotifier
* rm getMetrics from unpublished contracts
* remove deprecated getSubscriber
* **contractSupport:** rm unused metrics helpers
* **vaults:** correct getDebtIssuer name
* **vaults:** remove unused getCollaterals
* rename EndorsedUI to ReferencedUI

### Features

* **board-utils:** vbankAssets in makeAgoricNamesRemotesFromFakeStorage ([0a7bc2c](https://github.com/Agoric/agoric-sdk/commit/0a7bc2c806d80c93d20a9181d803ff9db0b709bd))
* **clientSupport:** Offers.fluxAggregator.PushPrice ([bae997a](https://github.com/Agoric/agoric-sdk/commit/bae997ae9d28bad0ec02896975044f27c64d123d))
* **vaults:** don't send empty amounts to reserve ([74a881d](https://github.com/Agoric/agoric-sdk/commit/74a881d9f683212de40e8736235f1009c617fec9))
* rename EndorsedUI to ReferencedUI ([8e904a9](https://github.com/Agoric/agoric-sdk/commit/8e904a9e379d69aa0c2a633ff2d6b3afb1b8005d))


### Bug Fixes

* **auction:** assets added after auction start don't set IST limit ([7916fcb](https://github.com/Agoric/agoric-sdk/commit/7916fcbe976fa8468400b3822875cfab303367a8))
* **clientSupport:** makePsmProposal types ([7b6782c](https://github.com/Agoric/agoric-sdk/commit/7b6782c88d65e52dc79398e8402822efdffe3684))
* **inter-protocol:** `start-local-chain.sh` uses correct config ([240f58e](https://github.com/Agoric/agoric-sdk/commit/240f58e880e16ee4580a7db142ba6de64429ef16))
* **vaultManager:** remaining vaults liquidated after proceeds ([5f83244](https://github.com/Agoric/agoric-sdk/commit/5f8324456306e3e2689c82827671243a0d031dee))
* **vaults:** address a divide-by-zero; correct penalty w/no bidders ([5e8b363](https://github.com/Agoric/agoric-sdk/commit/5e8b3634bf399960b19378fd3b8ea720edcb0e37)), closes [#7785](https://github.com/Agoric/agoric-sdk/issues/7785)
* **vaults:** handle failure sending to reserve ([3c043a5](https://github.com/Agoric/agoric-sdk/commit/3c043a577d18f1d202edcd013b77d5d92adf9d9f))
* **vaults:** when vault penalty gt collateral ([a79eff9](https://github.com/Agoric/agoric-sdk/commit/a79eff92cadb4114b1be10ce51e3ad9794de668e))
* **vaults!:** distribute all Collateral after liquidation ([d572ddf](https://github.com/Agoric/agoric-sdk/commit/d572ddf256e5405c0318678b00f4ba01eec18b11))
* **vaults!:** reduce proceeds to vault holders by share of penalty ([0a46a7c](https://github.com/Agoric/agoric-sdk/commit/0a46a7c5ce6d9149ba06742a5917eb4f9c6e415b))


### Miscellaneous Chores

* **price:** rm deprecated getRoundStartNotifier ([10f50aa](https://github.com/Agoric/agoric-sdk/commit/10f50aa42883bf2d0c9a30fc2765b67adeb503ae))
* remove deprecated getSubscriber ([36b4027](https://github.com/Agoric/agoric-sdk/commit/36b40274335479eebae286ce627e3197d4b2fd9c))
* rm getMetrics from unpublished contracts ([7514f6c](https://github.com/Agoric/agoric-sdk/commit/7514f6c700b6c70cc350fba87341cb36573cc7d7))
* **contractSupport:** rm unused metrics helpers ([8ba6d02](https://github.com/Agoric/agoric-sdk/commit/8ba6d02ed3e9d3669cf3ecf88efa70564d2523e9))
* **vaults:** correct getDebtIssuer name ([f624252](https://github.com/Agoric/agoric-sdk/commit/f624252dd9ab6ac59cba606d750400ed7513fe7a))
* **vaults:** remove unused getCollaterals ([f01ca33](https://github.com/Agoric/agoric-sdk/commit/f01ca3355f9708f68a000bbfc6cb67291198d73e))



## [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.14.0...@agoric/inter-protocol@0.15.0) (2023-05-24)


### Features

* **clientSupport:** Offers.fluxAggregator.PushPrice ([486581c](https://github.com/Agoric/agoric-sdk/commit/486581c8ea07a621f18c0d485c7059fb3e87835a))



## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.1...@agoric/inter-protocol@0.14.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* **auction:** schedule capture of auction price at auction start
* test-vaults-config -> itest-vaults-config to avoid conflict
* remove obsolete Treasury
* emit smallcaps-format data in all marshallers
* **vaults:** vstorage index node for managers
* **priceAuthority:** canonicalize registry
* **StakeFactory:** correct terminology for debt
* **vaults:** correct terminology for debt
* **governance:** remove getContractGovernor
* **auction:** Currency → Bid
* move PublicTopic to Zoe contractSupport
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
* **contractSupport:** remove stageDelta
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies (#7074)
* **vaultFactory:** rm root makeVaultInvitation
* storage paths by getPublicTopics
* remove 'asset' from publicSubscribers
* rename 'fit' to 'mustMatch'
* **vaultDirector:** remove getCollaterals from public facet
* **chainlink:** 'data' string to 'unitPrice' bigint
* replace econCommitteeCharter with (generalized) psmCharter

### Features

* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies ([#7074](https://github.com/Agoric/agoric-sdk/issues/7074)) ([ed5ee58](https://github.com/Agoric/agoric-sdk/commit/ed5ee58a276fce3c55f19e4f6f662ed579896c2c)), closes [#7047](https://github.com/Agoric/agoric-sdk/issues/7047)
* **auction:** durable offer book ([81d8a3e](https://github.com/Agoric/agoric-sdk/commit/81d8a3e8b72de7d3543054e2f7dc19f82cd57eef))
* **auctioneer:** enable when adding collateral type ([f6d8d96](https://github.com/Agoric/agoric-sdk/commit/f6d8d96aec8651606840482a1e8e332ca4b40309))
* **auctioneer:** guard bidSpec ([c9a2dcf](https://github.com/Agoric/agoric-sdk/commit/c9a2dcf1287651e8ae3b25387534d8d2a80b747b))
* **bootstrap:** diagnostics object ([1c42d09](https://github.com/Agoric/agoric-sdk/commit/1c42d0993dd35016516366905cecdd5756a25826))
* **bootstrap:** save privateArgs into diagnostics ([8c3626f](https://github.com/Agoric/agoric-sdk/commit/8c3626f374d6ae876406e0c887b199d1d5ac1e90))
* addAssetToVault: convert number to bigint for debtLimitValue ([9d19b42](https://github.com/Agoric/agoric-sdk/commit/9d19b420bd5df10a946c51c24d102f3f3c7922c9))
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* reject bids on brands with no books ([176f129](https://github.com/Agoric/agoric-sdk/commit/176f1292c37d851251fe39ce0b21cd5029720b6c))
* save createVat() results durably ([6009893](https://github.com/Agoric/agoric-sdk/commit/60098937d6922977f7a3f94c4098b3649536baa5))
* save most bootstrap powers to durable storage ([7b4212b](https://github.com/Agoric/agoric-sdk/commit/7b4212b73aa30259a07f856d9d257c8c5e3484d0))
* store bootstrap contract start results durably ([70a50f6](https://github.com/Agoric/agoric-sdk/commit/70a50f67a0a34e58d7e1926cebc63a7bde4ffa0f))
* **agops:** reserve command ([8d488ef](https://github.com/Agoric/agoric-sdk/commit/8d488ef60a957328995f282fc9c341a8fbadf1cb))
* **agoric-cli:** propose PriceLockPeriod change ([4afe441](https://github.com/Agoric/agoric-sdk/commit/4afe4419631af74d6e870bbb16fb2f35a68a5795))
* **auction:** add an auctioneer to manage vault liquidation ([#7000](https://github.com/Agoric/agoric-sdk/issues/7000)) ([398b70f](https://github.com/Agoric/agoric-sdk/commit/398b70f7e028f957afc1582f0ee31eb2574c94d0)), closes [#6992](https://github.com/Agoric/agoric-sdk/issues/6992) [#7047](https://github.com/Agoric/agoric-sdk/issues/7047) [#7074](https://github.com/Agoric/agoric-sdk/issues/7074)
* **auction:** allow orders to automatically exit after partial fill ([#7269](https://github.com/Agoric/agoric-sdk/issues/7269)) ([58d36fb](https://github.com/Agoric/agoric-sdk/commit/58d36fb9dfaaad0c0a962ba2940b6fcba2ea8b25))
* **auction:** Auction allows vaults to specify an amount to raise ([#7239](https://github.com/Agoric/agoric-sdk/issues/7239)) ([bf35d83](https://github.com/Agoric/agoric-sdk/commit/bf35d8366bf5b8e69278746ecafee20d0a024756))
* **auction:** auction send leftovers to Reserve ([e9be520](https://github.com/Agoric/agoric-sdk/commit/e9be520690a88bc82c7514bfc9fe60394e1d08d4))
* **auction:** clearer bid offer result message ([048a7db](https://github.com/Agoric/agoric-sdk/commit/048a7db523b727c6959c0c4fb3782ed3508e32e8))
* **auction:** minimum give of Currency ([909dba6](https://github.com/Agoric/agoric-sdk/commit/909dba6a25b72db81bacaecadd93b3f3b2584bdf))
* **board-utils:** BoardRemote like Remotables ([3aa44de](https://github.com/Agoric/agoric-sdk/commit/3aa44debbdc955892611ba870478fb088395cf10))
* **bundleTool:** idempotent provideBundleCache ([026bcd4](https://github.com/Agoric/agoric-sdk/commit/026bcd4abe39fa2c73a05c3837b7e04082db1157))
* **clientSupport:** Offers.auction.Bid ([b2fc054](https://github.com/Agoric/agoric-sdk/commit/b2fc054b8a7b8d6b090ef1ef673502d070262556))
* **contractSupport:** makeNatAmountShape ([ad6e973](https://github.com/Agoric/agoric-sdk/commit/ad6e9736e5472811c609e9f893112d05dc32f07d))
* **contractSupport:** PublicTopics types and utils ([2c7865f](https://github.com/Agoric/agoric-sdk/commit/2c7865fa4e43c96c9a85be743a7f808a66b9311e))
* **core:** HighPrioritySendersManager ([7b382e4](https://github.com/Agoric/agoric-sdk/commit/7b382e49a1521d367c5b8db18fa7efa2b77ef7e3))
* **ec:** prioritize EC messages ([d91f272](https://github.com/Agoric/agoric-sdk/commit/d91f2725334ba5eb9ee8ca2e908a81dea4840784))
* **ec-charter:** VoteOnApiCall ([8f3adf6](https://github.com/Agoric/agoric-sdk/commit/8f3adf658ebfbf4cb1b8ce2ae82bdff89af7eef3))
* **econComittee:** upgradable ([a07acef](https://github.com/Agoric/agoric-sdk/commit/a07acef7d590b289b92240b98046aa6b756d982f))
* **economy-config:** allow override of PRIMARY_ADDRESS ([06119b8](https://github.com/Agoric/agoric-sdk/commit/06119b81005c61641781614fab2c206f13b43ff8))
* **fluxAggregator:**  pushPrice roundId optional ([ca62d7a](https://github.com/Agoric/agoric-sdk/commit/ca62d7afc78c1b58445168db20583f5b5ccfb7b6))
* **fluxAggregator:** add startedBy to latestRoundPublisher ([#6794](https://github.com/Agoric/agoric-sdk/issues/6794)) ([692d6ca](https://github.com/Agoric/agoric-sdk/commit/692d6ca0e1fdf88b35a546b438412e4e59167fa6))
* **fluxAggregator:** upgradable ([662d57a](https://github.com/Agoric/agoric-sdk/commit/662d57a1023d942e1a1a69e504be3c8719a794cc))
* **governance:** compatibility with upgrade ([1912d18](https://github.com/Agoric/agoric-sdk/commit/1912d18a98cc3fbbc6756c12c8b843bc76de0ad6))
* **inter-protocol:** add core proposal for psm governance ([57f60de](https://github.com/Agoric/agoric-sdk/commit/57f60dea112bb0282c232a16d379990fb3b50537))
* **inter-protocol:** add initialPricePct option to proposals ([78c496e](https://github.com/Agoric/agoric-sdk/commit/78c496ea65e6a2c7c42485eb5a6b244eec800bfe))
* **inter-protocol:** enable PSM core proposal ([29e9f4f](https://github.com/Agoric/agoric-sdk/commit/29e9f4f46de98e0fdec4f3b9006f0f466cf7329d))
* **inter-protocol:** generalize PSM charter to any param governance ([37888c9](https://github.com/Agoric/agoric-sdk/commit/37888c9fa5ce3fe92eccbeba50f0b2f5e30a1b9a))
* **inter-protocol:** label contract vats ([271b530](https://github.com/Agoric/agoric-sdk/commit/271b530918346d64c6a0e236741879f8b26acc4b))
* **inter-protocol:** plausible defaults for addAssetToVault ([2080b3a](https://github.com/Agoric/agoric-sdk/commit/2080b3a1c2304eb789de8206add5c002ce41ac70))
* **inter-protocol:** separate inviteCommitteMembers from inviteToCharter ([4c5340d](https://github.com/Agoric/agoric-sdk/commit/4c5340d9a40ecd9c27d68aee48a4d97a868f5eb9))
* **inter-protocol:** set keyword shares on feeDistributor ([#6962](https://github.com/Agoric/agoric-sdk/issues/6962)) ([1d9c7b7](https://github.com/Agoric/agoric-sdk/commit/1d9c7b76897fb19f27c17eaacc949d3cccc3c8f3))
* **oracle:** improve round start error message ([34ca78e](https://github.com/Agoric/agoric-sdk/commit/34ca78ea1493a295cc14a32349de02ede2a45688))
* **price:** addOracles by EC ([9b6dbc5](https://github.com/Agoric/agoric-sdk/commit/9b6dbc5816d9eadaf5800090d060dda73a0d2e8d))
* **price:** prioritize oracle messages ([f288f42](https://github.com/Agoric/agoric-sdk/commit/f288f42d93a0066449fe09182b4ece2241052199))
* **price:** removeOracles by EC ([8720d22](https://github.com/Agoric/agoric-sdk/commit/8720d22ddf25a005aee25786bfa8ee4bccaf19c9))
* **priceAuthority:** canonicalize registry ([9a6466d](https://github.com/Agoric/agoric-sdk/commit/9a6466d87061f93f61fde1f39562971e84d8f027))
* **priceAuthority:** registry singleton durable ([3d20838](https://github.com/Agoric/agoric-sdk/commit/3d20838953dd216e44cc5488922ce09ed7d51a56))
* **prices:** scaledPriceAuthority upgradable ([91c6181](https://github.com/Agoric/agoric-sdk/commit/91c6181ff6e7cbd74e884174e90aa9510efc229a))
* **psm:** durable facets ([95adb26](https://github.com/Agoric/agoric-sdk/commit/95adb26b2e877251e01ada8facc6007244f16e90))
* **psm:** durable metrics subscriber ([6b24cf2](https://github.com/Agoric/agoric-sdk/commit/6b24cf273eb8d53d8bbcf1e2fc1b68fb45b0d38f))
* **psm:** validate terms and args before start ([d09f21b](https://github.com/Agoric/agoric-sdk/commit/d09f21ba2b9f2c49488455008efdda8fb5601868))
* **reserve:** durable facets ([e10b6c1](https://github.com/Agoric/agoric-sdk/commit/e10b6c182b7742de70872b09394de70a3e4da27c))
* **smart-wallet:** exit offer ([7323023](https://github.com/Agoric/agoric-sdk/commit/7323023308aa40c145e60093b7fc52580534cd2d))
* **smart-wallet:** publish pending offers before completion ([c913b36](https://github.com/Agoric/agoric-sdk/commit/c913b36950be1d2ae1b16d16bfcfc8df32305e0c))
* **smart-wallet:** publish possibly exitable offers ([de0170a](https://github.com/Agoric/agoric-sdk/commit/de0170add5bd4c82cbef23431bffaa95f7007880))
* **smartWallet:** fail early on offerId re-use ([08307e0](https://github.com/Agoric/agoric-sdk/commit/08307e01a6c9a3d53144df55f52e03f8f9df2a78))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **vats:** Scoped bridge managers ([11f6429](https://github.com/Agoric/agoric-sdk/commit/11f64298d8529cca249d2933894236dc534dfe3e))
* **vault:** durable farclass with guard ([f4cfe17](https://github.com/Agoric/agoric-sdk/commit/f4cfe17e08d6cdd22236cf93b5e7b98137dd66c9))
* **vaultDirector:** durable farclass with guard ([632af34](https://github.com/Agoric/agoric-sdk/commit/632af34f04fac76e22277c8739d08d505705a73a))
* **vaultFactory:** always allow pure gives ([f5eaf3d](https://github.com/Agoric/agoric-sdk/commit/f5eaf3d3fe818d05e6b051378a602908fe28e479))
* **vaultFactory:** minimumCollateralization param ([16eac0c](https://github.com/Agoric/agoric-sdk/commit/16eac0c83a59feb399536587c456e4aee47129b7))
* **vaultFactory:** scope invitation descriptions ([61d853f](https://github.com/Agoric/agoric-sdk/commit/61d853f7c02052da8852973fad722d92ae973994))
* **vaultFactory:** UI version hash governed param ([#6873](https://github.com/Agoric/agoric-sdk/issues/6873)) ([e208b20](https://github.com/Agoric/agoric-sdk/commit/e208b20dd5cc425257576c71dce961a55b74a6de)), closes [#6860](https://github.com/Agoric/agoric-sdk/issues/6860)
* **vaultHolder:** durable publish kits ([6f61cea](https://github.com/Agoric/agoric-sdk/commit/6f61cea32bd11976e3a79312357903d9471ebfb4))
* **vaultManager:** publish quotes to vstorage ([bad4226](https://github.com/Agoric/agoric-sdk/commit/bad422692a7d7d7f8009eecdead3fdb12c231b6b))
* **vaults:** durable Recorders for chain storage ([0e34930](https://github.com/Agoric/agoric-sdk/commit/0e3493025685a413cccd99f9e41a3c9c9a8c99cd))
* **vaults:** governable interest timing ([f22f144](https://github.com/Agoric/agoric-sdk/commit/f22f1440b352eb47ba47425afdb01d19a045a9ae))
* **vaults:** manager singletons provider ([54c1f51](https://github.com/Agoric/agoric-sdk/commit/54c1f513d9899adef6b9e8bb4a40907ee581550b))
* **vaults:** one Exo kind for VaultManager ([29660dd](https://github.com/Agoric/agoric-sdk/commit/29660dddb9533d8f55ebd43a5f59f9a0d93f0d62))
* **vaults:** parameterize collateralBrandKey ([ede7dea](https://github.com/Agoric/agoric-sdk/commit/ede7deaf44ad43170bc9b297460f8587183fb0d9))
* **vaults:** restart processes each prepare() ([b15fd16](https://github.com/Agoric/agoric-sdk/commit/b15fd165883a226ae545549fe4a91bd895303ddf))
* **vaults:** restore non-durable param managers ([096e738](https://github.com/Agoric/agoric-sdk/commit/096e73815ce4ee188ae35c30feb162a1104c65b0))
* **vaults:** set endorsedUi default from chain config ([fc0b2fc](https://github.com/Agoric/agoric-sdk/commit/fc0b2fca4bd26f5b35504109143a51da5d0a059f))
* **vaults:** skip price check for pure gives ([fbb7aa5](https://github.com/Agoric/agoric-sdk/commit/fbb7aa50d714e2db2267e00a74797a9ddb608d75))
* **vaults:** vstorage index node for managers ([6e1f851](https://github.com/Agoric/agoric-sdk/commit/6e1f851fc38f8e1325408e244d12df4acbf5ba31))
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric-sdk/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric-sdk/issues/7482)
* change offerArgs keyword from want to maxBuy, wire through CLI ([#7451](https://github.com/Agoric/agoric-sdk/issues/7451)) ([7cd7bb7](https://github.com/Agoric/agoric-sdk/commit/7cd7bb774981620f76b30aca217d8e5428f8987d))
* start PSM contracts with metrics, governance from previous published state ([#7480](https://github.com/Agoric/agoric-sdk/issues/7480)) ([1a65832](https://github.com/Agoric/agoric-sdk/commit/1a65832592a0d5c29326d9a666328662dd8740f9)), closes [#6645](https://github.com/Agoric/agoric-sdk/issues/6645)
* **vaults:** when adjusting consider liq price ([6fd7a32](https://github.com/Agoric/agoric-sdk/commit/6fd7a3208f6ea7fb692e42207bc54afb78459088))
* clientSupport for bidding, reserve ([3a27543](https://github.com/Agoric/agoric-sdk/commit/3a27543e3fef3587d26fe3719bad758edebce275))
* introduce auctioneer to econCommitteeCharter ([af1b253](https://github.com/Agoric/agoric-sdk/commit/af1b2538924e2112448b026901dfb7c37dce2f86))
* **wallet:** executeOffer throw errors ([224dbca](https://github.com/Agoric/agoric-sdk/commit/224dbca918343608d53f691a448171c8a48d283e))
* **wallet:** reject executeOffer on failure ([308caab](https://github.com/Agoric/agoric-sdk/commit/308caab24c1680c2c7910eff8128f9089dedf26d))
* agops vaults open ([4765644](https://github.com/Agoric/agoric-sdk/commit/476564471471e84e8add6224458bdaff92d15b68))
* boot-oracles ([ce8f8de](https://github.com/Agoric/agoric-sdk/commit/ce8f8de65ad4c14b4e8d699cd721683cfa1cc495))
* cache bundles in initializeSwingset ([6e57171](https://github.com/Agoric/agoric-sdk/commit/6e57171ef303334e4cb776ba3fa503f5219d409e))
* durable oracleStatuses, rounds, details ([f4d7a63](https://github.com/Agoric/agoric-sdk/commit/f4d7a634d604a75e0c4d9901c8c9b6bb6fd2253b))
* durable smart wallet ([6977f73](https://github.com/Agoric/agoric-sdk/commit/6977f73f820a9345ef49f4f18095a5c88af06729))
* fixed heap for getPublicTopics ([1886c3a](https://github.com/Agoric/agoric-sdk/commit/1886c3af2319b9540faa318cf6179d4d01eec084))
* getPath() on StorageNode and StoredSubscriber ([dae47a5](https://github.com/Agoric/agoric-sdk/commit/dae47a553288335960b5e4f2741a09b87ae896bc))
* hold onto adminFacets in bootstrap ([#6094](https://github.com/Agoric/agoric-sdk/issues/6094)) ([a2ecdec](https://github.com/Agoric/agoric-sdk/commit/a2ecdecdfb35bc752af2d5d9cc611a1d00d489cf)), closes [#6034](https://github.com/Agoric/agoric-sdk/issues/6034)
* include oracleId in OracleStatus ([680cdb7](https://github.com/Agoric/agoric-sdk/commit/680cdb79160d19360e47d9416725def4891981d5))
* priceAggregatorChainlink in inter-protocol ([d8707a5](https://github.com/Agoric/agoric-sdk/commit/d8707a59431223fcd394b0fbb94284e22237446c))
* provideChildBaggage helper ([d5c728f](https://github.com/Agoric/agoric-sdk/commit/d5c728f5bb6002ef13e1ddda5c0212d808c99609))
* RoundsManagerKit guards ([1b47084](https://github.com/Agoric/agoric-sdk/commit/1b47084c38043112ce615a464f3ab278b3d532bb))
* storage paths by getPublicTopics ([40a8624](https://github.com/Agoric/agoric-sdk/commit/40a8624240f241a686c28bd7d7c7ef1ef780f984))
* support singleton args in provideChildBaggage ([9b438c4](https://github.com/Agoric/agoric-sdk/commit/9b438c49fead26e2a41bc437e5eedd2b38741724))
* **vaultHolder:** durable farclass with guard ([284fc81](https://github.com/Agoric/agoric-sdk/commit/284fc8159c81b86725961c1752f971148f515013))
* **vaultManager:** durable farclass with guard ([30db9b6](https://github.com/Agoric/agoric-sdk/commit/30db9b6973848a6c5fdf76e4a4da8af4858e1ac4))
* throw pushPrice errors ([bc42385](https://github.com/Agoric/agoric-sdk/commit/bc4238510e67a5b7340210218c74866996f83052))
* throw recordSubmission errors ([7261b6f](https://github.com/Agoric/agoric-sdk/commit/7261b6f9fae7e12328d80711b97982df97450b3b))
* UX for `inter bid` ([52d93c3](https://github.com/Agoric/agoric-sdk/commit/52d93c33edbad2bebd54a6eb967853e7292de2e7))


### Bug Fixes

* **agops:** psm swap params ([3a21dd1](https://github.com/Agoric/agoric-sdk/commit/3a21dd1f310036cfcd9f611e5089e41621e692ae))
* **auction:** await hazard in clockTick ([c6a7f7e](https://github.com/Agoric/agoric-sdk/commit/c6a7f7edd07727cea29949a63604ba23ff9546b9))
* **auction:** clockTick promise handling ([0218b3c](https://github.com/Agoric/agoric-sdk/commit/0218b3cc6cc6940c8c5662322651b0977ea7e961))
* **auction:** clockTick promise handling ([e03470d](https://github.com/Agoric/agoric-sdk/commit/e03470d4c2427b1f0e425ba46154779dd6ac9c48))
* **auction:** Currency → Bid ([650cf4c](https://github.com/Agoric/agoric-sdk/commit/650cf4c6527c92724dac7b4587bdbecd690a6abc))
* **auction:** defensive queueLiveSchedule ([688797b](https://github.com/Agoric/agoric-sdk/commit/688797b0319343cbbb0dce5e75600aad6e44a27d))
* **auction:** handle all promises ([3b30c72](https://github.com/Agoric/agoric-sdk/commit/3b30c72d9d4fc823fa1cc74778472e04c1da871b))
* **auction:** handle auction waking a little bit late gracefully ([6fb4be6](https://github.com/Agoric/agoric-sdk/commit/6fb4be62c3232014ed4a026fcc6214c1cc91807a)), closes [#7677](https://github.com/Agoric/agoric-sdk/issues/7677)
* **auction:** publish updates when lockedPrice changes ([#7574](https://github.com/Agoric/agoric-sdk/issues/7574)) ([e9260d3](https://github.com/Agoric/agoric-sdk/commit/e9260d3ea1f69b7d2aa5bb382586c8d31323f93b))
* **auction:** recovering from late start ([7842f2d](https://github.com/Agoric/agoric-sdk/commit/7842f2dbcb810c25f5cacd99c56ecf03d7386c77))
* **auction:** schedule capture of auction price at auction start ([b0997e9](https://github.com/Agoric/agoric-sdk/commit/b0997e989a38b78da56d450f1e087482990559bf)), closes [#7898](https://github.com/Agoric/agoric-sdk/issues/7898) [#7794](https://github.com/Agoric/agoric-sdk/issues/7794)
* **auction:** set up one observer of governance ([16dbf24](https://github.com/Agoric/agoric-sdk/commit/16dbf24535bfe930543f74906aa356a5b12e7c52))
* **governance:** governor adminFacet handling ([785950a](https://github.com/Agoric/agoric-sdk/commit/785950ac02dbff9c9948f11d38f35924b0f36a9b))
* **inter-protocol:** handle branded TimestampRecord ([a350418](https://github.com/Agoric/agoric-sdk/commit/a350418969dc34b6d32f1584f40b51271b139c68))
* **inter-protocol:** IbcATOM -> ATOM ([d8b2a64](https://github.com/Agoric/agoric-sdk/commit/d8b2a640b428bafabdde84a8cbc22a022694e0ef))
* **inter-protocol:** provide missing instances and governors for kits ([c827220](https://github.com/Agoric/agoric-sdk/commit/c827220744524deeb703fb5f52342b8602e7a610))
* **inter-protocol:** save price feed and vbank admin facets ([83a7837](https://github.com/Agoric/agoric-sdk/commit/83a78378681cf0a8c6b2824e4312c701ae9a9c5e))
* **inter-protocol:** save psm mintHolder admin facet ([8ab6582](https://github.com/Agoric/agoric-sdk/commit/8ab6582a5514d10d9e603a9a490f3d311419c294))
* **inter-protocol:** save scaledPriceAuthority admin facets ([f65260f](https://github.com/Agoric/agoric-sdk/commit/f65260f1c7b54402cd2639d8dc605c6376ab24a9))
* **liquidation:** possible infinite loop ([f94ecc2](https://github.com/Agoric/agoric-sdk/commit/f94ecc2255d94b94297b332edae038261cf6f33f))
* **oracles:** set min oracles in devnet to 3 ([8c707f8](https://github.com/Agoric/agoric-sdk/commit/8c707f8ffe2c33cb3b48dd6217a8c3b5b50ec576))
* **price:** handle restartContract ([30f5405](https://github.com/Agoric/agoric-sdk/commit/30f5405c453b61a715fb3a3ac7b77ebc9df0a9e0))
* **price:** highPrioritySendersManager is optional ([7563973](https://github.com/Agoric/agoric-sdk/commit/7563973111a10fe89bc4287d9815e485b5f48153))
* **price-feed-proposal:** makeIssuerKit().brand is not upgradeable ([4df25ab](https://github.com/Agoric/agoric-sdk/commit/4df25ab64ec0ca143ad0e3ffb3e69af30cd6ee81))
* **proposals:** floating promises ([2fede19](https://github.com/Agoric/agoric-sdk/commit/2fede19c5425e03338a6e4434e86d52cf7a880fd))
* **psm:** duplicate startEconCharter ([b530785](https://github.com/Agoric/agoric-sdk/commit/b5307853607a78d37ae9769340b1f67e32580d0a))
* **reserve:** floating promises ([dac1433](https://github.com/Agoric/agoric-sdk/commit/dac1433d7a8560ed28e2fe01c657569f91a949a3))
* **scheduler:** handling param changes ([37145cf](https://github.com/Agoric/agoric-sdk/commit/37145cfbbb3ce6666ddcccd013980a36ad613211))
* **vaultFactory:** floating promises ([b187a54](https://github.com/Agoric/agoric-sdk/commit/b187a54c11c991f61b2e9d6b083425b7a63ac889))
* **vaultFactory:** terminate on failure to start() ([193e8ec](https://github.com/Agoric/agoric-sdk/commit/193e8ec0f0c36eb3f9b0388597a919910d9a276b))
* **vaults:** missing totalDebt updates ([854211c](https://github.com/Agoric/agoric-sdk/commit/854211c0789a0218288afac641f6ee49d639268e))
* **vaults:** Publish after collateral is returned ([20d5506](https://github.com/Agoric/agoric-sdk/commit/20d5506fa0fc98cff64bb5fd3225da2ad475791c)), closes [#7665](https://github.com/Agoric/agoric-sdk/issues/7665)
* **vaults:** reconstitue vaults correctly ([7e286a5](https://github.com/Agoric/agoric-sdk/commit/7e286a5ed76de7bfaee4307a147190b919043109)), closes [#7784](https://github.com/Agoric/agoric-sdk/issues/7784) [#1](https://github.com/Agoric/agoric-sdk/issues/1)
* **vaults:** return correct collateral after liquidation ([d86fc99](https://github.com/Agoric/agoric-sdk/commit/d86fc9959192799e9b55278ee26f88829ef21764)), closes [#7779](https://github.com/Agoric/agoric-sdk/issues/7779) [#7346](https://github.com/Agoric/agoric-sdk/issues/7346)
* avoid exporting USD oracle brand from bootstrap ([445a0fe](https://github.com/Agoric/agoric-sdk/commit/445a0fe7d8baca54b18dd2fc8108f93e41e84543))
* correct accounting numbers in liquidation and auction ([54ef901](https://github.com/Agoric/agoric-sdk/commit/54ef901d2313b3e1c8755cfa1d455bcc7f24d754))
* find agd in agoric-sdk/bin rather than ~/go/bin ([d772339](https://github.com/Agoric/agoric-sdk/commit/d772339fdd7a05c14dd0fca5be6619ff00f1a61e))
* make auction scheduler robust against bad parameter combos ([93b92b8](https://github.com/Agoric/agoric-sdk/commit/93b92b836b7ea64121a38d5ca33dd3e78888e2aa))
* test-vaults-config -> itest-vaults-config to avoid conflict ([db8f915](https://github.com/Agoric/agoric-sdk/commit/db8f915f579293d373d9f395dae28da383fab8a3))
* **proposals:** observe debtLimitValue ([d1738a4](https://github.com/Agoric/agoric-sdk/commit/d1738a4b3cd24875e6848d2c8fd371314390420a))
* **StakeFactory:** correct terminology for debt ([8b7ddc2](https://github.com/Agoric/agoric-sdk/commit/8b7ddc2556be17c6b0409983d8632fe6f98c4aa3))
* **types:** PromiseSpace ([fc89a56](https://github.com/Agoric/agoric-sdk/commit/fc89a56ec481221cb35e7677c820631f89ffde3c))
* **vault:** vestige of async price quote ([d8aacb3](https://github.com/Agoric/agoric-sdk/commit/d8aacb3f92c1109b18088864f43be1e6266d6262))
* **vaults:** when reconstituting vaults, report correct shortfall ([3470475](https://github.com/Agoric/agoric-sdk/commit/34704753a783fe54874cc1c073928447d10faa3f)), closes [#7474](https://github.com/Agoric/agoric-sdk/issues/7474)
* privateArgsShape for restart ([fd6572e](https://github.com/Agoric/agoric-sdk/commit/fd6572e35fe2de24ad25939a4e0da774bd3af0e5))
* **vaults:** correct terminology for debt ([e23ad70](https://github.com/Agoric/agoric-sdk/commit/e23ad70e3d02b5fbacdd54d37fe821d03033b9be))
* **vaults:** reset lockedQuote at start of auction ([ed808d9](https://github.com/Agoric/agoric-sdk/commit/ed808d9ea3622926eefb254e00910e598d38e26e)), closes [#7670](https://github.com/Agoric/agoric-sdk/issues/7670)
* Process remotables in vstorage data migrated through bootstrap ([433c1f1](https://github.com/Agoric/agoric-sdk/commit/433c1f184c76758489670f8e4809eb0baf04ece8))
* TimerBrand has isMyTimerService(), not isMyTimer() ([9f4e867](https://github.com/Agoric/agoric-sdk/commit/9f4e8670694504ebbd451c8840f900a1a24b902f))
* **vaults:** runtime types for governance ([e91661d](https://github.com/Agoric/agoric-sdk/commit/e91661dfdce623037860a99077667a8b809f05a1))
* code updates for new marshal ([292f971](https://github.com/Agoric/agoric-sdk/commit/292f971769db69e61782f96638c2f687c3f95ac2))
* initially all rewards go to the reserve ([7d0dd55](https://github.com/Agoric/agoric-sdk/commit/7d0dd558e5654aa36094b32d2f30c768479cd3b8))
* missing zoe arg in setDestinations() ([9505588](https://github.com/Agoric/agoric-sdk/commit/9505588587f952028cd88e4bcd4c5aefad47ea1e))
* nextAuction timing when startFrequency is reduced ([#7415](https://github.com/Agoric/agoric-sdk/issues/7415)) ([ad87770](https://github.com/Agoric/agoric-sdk/commit/ad87770a9b629c089937e48d26601441ae949e47))
* save economicCommitteeKit (incl. admin) not just creator facet ([7d95f1e](https://github.com/Agoric/agoric-sdk/commit/7d95f1e3876f5d4b79a6dde4408650372010ad48))
* some stateShapes ([50c9fe4](https://github.com/Agoric/agoric-sdk/commit/50c9fe49d0fe890a08c0c28a00780f4924f7928c))
* **action:** handle missing Collateral allocation ([88ef23d](https://github.com/Agoric/agoric-sdk/commit/88ef23dd3ea62d0056fd476d333346b6b884f574))
* **auction:** durability ([de394d3](https://github.com/Agoric/agoric-sdk/commit/de394d37288005f77ad17c19ae121eeb7cd5abc2))
* **auction:** pipeTopicToStorage with Recorder kit ([2f460a0](https://github.com/Agoric/agoric-sdk/commit/2f460a0105d0ec34d4e6345b36ebeb519854f43c))
* **deps:** removed duplicate @endo/nat dependency in inter-protocols package.json file ([#7015](https://github.com/Agoric/agoric-sdk/issues/7015)) ([8652412](https://github.com/Agoric/agoric-sdk/commit/86524125b83076ce15f3c045755295b7c2887c60))
* **inter-protocol:** add to reserve did not update metrics ([#7232](https://github.com/Agoric/agoric-sdk/issues/7232)) ([3825602](https://github.com/Agoric/agoric-sdk/commit/3825602ca28838f8c2d1ee650952179445ec3f4c))
* **inter-protocol:** get vo-test-harness.js from new liveslots package ([eedd90c](https://github.com/Agoric/agoric-sdk/commit/eedd90cb4ba4213b1319f408821edf1b5c69a082))
* **inter-protocol:** linux compat ([ca9a18d](https://github.com/Agoric/agoric-sdk/commit/ca9a18d43ca7016cf06df17e58e271c4682abdc7))
* **inter-protocol:** quote the debt offer ([42cb2a2](https://github.com/Agoric/agoric-sdk/commit/42cb2a24e07076e1d17e556fb5c7f64ee8861df4))
* **oracle:** default restartDelay parameter ([9d3a4cf](https://github.com/Agoric/agoric-sdk/commit/9d3a4cf488c9964ffb9aae0ad80b04fb9188f24f))
* **price:** pipeTopicToStorage with Recorder kit ([5269d2f](https://github.com/Agoric/agoric-sdk/commit/5269d2f60feb388263a36f62a61e3b8fda04b07d))
* **priceFeed:** check for valueOutForUnitIn ([120b079](https://github.com/Agoric/agoric-sdk/commit/120b079b08ffc866e2a76f4a0b2ea5f41d522d02))
* **smart-wallet:** create purses for new assets lazily ([e241ba0](https://github.com/Agoric/agoric-sdk/commit/e241ba03a7d9f441436b3d987f9327060d7dd8ce))
* **types:** ZoeService annotation ([24aebe6](https://github.com/Agoric/agoric-sdk/commit/24aebe69b6773a7c63cc0d1193e5e09eb4e52cc6))
* **vaultHolder:** invitationMakers far obj ([c6501d8](https://github.com/Agoric/agoric-sdk/commit/c6501d847dffe78dea4f9c5716dd58186d8a4bb3))
* **vaultManager:** publish asset topic ([ca17009](https://github.com/Agoric/agoric-sdk/commit/ca17009bc814d348e89caaf466e5aee24f2414ac))
* **vaults:** check want against MinInitialDebt ([a6d1ad1](https://github.com/Agoric/agoric-sdk/commit/a6d1ad12626a5c77ab27977174f64434034792c1))
* **vaults:** durable invitationMakers ([aec82e8](https://github.com/Agoric/agoric-sdk/commit/aec82e863aaf958f9b89d5d76655cfe549b3d66a))
* **vaults:** error handling with shortfallReporter ([df235d0](https://github.com/Agoric/agoric-sdk/commit/df235d0e080faee898455dee9cd19cf628b5917f))
* **vaults:** failures don't consume a vaultId ([50a077d](https://github.com/Agoric/agoric-sdk/commit/50a077d0bed523029841a282152de515774dcd94))
* **wallet:** pipeTopicToStorage with Recorder kit ([31b79b7](https://github.com/Agoric/agoric-sdk/commit/31b79b71eda59b62d3bacd7ca648b53b9385afc0))
* align testnet -> agoric start tooling ([ead89fb](https://github.com/Agoric/agoric-sdk/commit/ead89fb49b4095f326f4bbab52ac79c9dd7d0e2f))
* await was missing in test ([#7163](https://github.com/Agoric/agoric-sdk/issues/7163)) ([7a7bf5a](https://github.com/Agoric/agoric-sdk/commit/7a7bf5a4f6ec962f39c6c0c573f8bc2770be4526))
* better proposal mismatch errors ([#6477](https://github.com/Agoric/agoric-sdk/issues/6477)) ([42fdddf](https://github.com/Agoric/agoric-sdk/commit/42fdddfbc87a7e61b848cdf00a06f1886af935d7))
* include liquidationMargin in liquidation ([#7203](https://github.com/Agoric/agoric-sdk/issues/7203)) ([ce0db6b](https://github.com/Agoric/agoric-sdk/commit/ce0db6b58fe41a719c47bd1971b63967e0bd9010)), closes [#7191](https://github.com/Agoric/agoric-sdk/issues/7191)
* **scaledPriceAuthority:** invert initialPrice; support quoteGiven ([5dad466](https://github.com/Agoric/agoric-sdk/commit/5dad4660100d6c776f1757ea2e5d7d27890665a2))
* **vaults:** exit seat after failure ([4a550ee](https://github.com/Agoric/agoric-sdk/commit/4a550ee5ebc1ea04a6052329be61c9335a722716))
* **zoe:** payments more recoverable ([#7112](https://github.com/Agoric/agoric-sdk/issues/7112)) ([ce7244d](https://github.com/Agoric/agoric-sdk/commit/ce7244d6cf23f57e6de73b5d119e9681456fded7))
* change manifestInstallRef to manifestBundleRef ([4b87694](https://github.com/Agoric/agoric-sdk/commit/4b8769494eec1ce6bb5beda295389e8b982a9f37))
* checkDebtLimit threshold ([b242776](https://github.com/Agoric/agoric-sdk/commit/b242776dbafd4dce173588303983af243f2eb674))
* multiple deposits of unknown brand ([6ef6062](https://github.com/Agoric/agoric-sdk/commit/6ef6062a4b69b0d44b18dc576021bbbaf372b3b2))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* rename vivify to prepare ([#6825](https://github.com/Agoric/agoric-sdk/issues/6825)) ([9261e42](https://github.com/Agoric/agoric-sdk/commit/9261e42e677a3fc31f52defc8fc7ae800f098838))
* replace econCommitteeCharter with (generalized) psmCharter ([786d2d2](https://github.com/Agoric/agoric-sdk/commit/786d2d26a56c08bfa75828de6eb2c60ce846d241))
* replace staging with atomic transfer ([9a2a085](https://github.com/Agoric/agoric-sdk/commit/9a2a085dc4d74c614c646c19b04f5dad53ac0257))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* replace zoe.install with zoe.installBundleID ([8a91b1b](https://github.com/Agoric/agoric-sdk/commit/8a91b1b06bf1a62c08156e595cf46f5194f73337)), closes [#6826](https://github.com/Agoric/agoric-sdk/issues/6826)
* report pushPrice error in offerStatus ([73f24e8](https://github.com/Agoric/agoric-sdk/commit/73f24e85c729e3423c47c9ef098426ee4fea59ac))
* simplify unnecessary promise ([#6479](https://github.com/Agoric/agoric-sdk/issues/6479)) ([ffe5e7f](https://github.com/Agoric/agoric-sdk/commit/ffe5e7ff3dd7ec1ffbbcd86e244ef167ed70c53b))
* update all clients of @agoric/time to handle the new home ([5c4fb24](https://github.com/Agoric/agoric-sdk/commit/5c4fb241940c74be6b081718b9350bceba95b9cd))
* update types/dependencies for new @agoric/time ([418545a](https://github.com/Agoric/agoric-sdk/commit/418545ae88085de6e7fde415baa7de0a3f3056a4))
* use atomicTransfers rather than stagings. ([#6577](https://github.com/Agoric/agoric-sdk/issues/6577)) ([65d3f14](https://github.com/Agoric/agoric-sdk/commit/65d3f14c8102993168d2568eed5e6acbcba0c48a))


### Code Refactoring

* move PublicTopic to Zoe contractSupport ([c51ea3d](https://github.com/Agoric/agoric-sdk/commit/c51ea3de22f50e05fcc1aaabd2108e785d51eb2e))


### Miscellaneous Chores

* remove obsolete Treasury ([2819781](https://github.com/Agoric/agoric-sdk/commit/2819781eefc25c90648158575dbe5aff3848fa3f))
* **chainlink:** 'data' string to 'unitPrice' bigint ([a8c836c](https://github.com/Agoric/agoric-sdk/commit/a8c836cb70a033d78199372669f6f95314de4d8f))
* **contractSupport:** remove stageDelta ([aceb7e3](https://github.com/Agoric/agoric-sdk/commit/aceb7e377ea19dab60497f8371595f57ed1e09e4))
* **governance:** remove getContractGovernor ([92fa9a2](https://github.com/Agoric/agoric-sdk/commit/92fa9a262b1b190d8535f826197a5df0c1ba9958))
* **vaultDirector:** remove getCollaterals from public facet ([0e7b9b3](https://github.com/Agoric/agoric-sdk/commit/0e7b9b351795f7168e56323a2c474459274d23f4))
* **vaultFactory:** rm root makeVaultInvitation ([6ad32cc](https://github.com/Agoric/agoric-sdk/commit/6ad32cc6d17b4b60df5048d204870cec027226f5))
* remove 'asset' from publicSubscribers ([56d5d86](https://github.com/Agoric/agoric-sdk/commit/56d5d8647f9c6063c9ec1cbdb3e88b761a6c7eda))
* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



### [0.13.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.2...@agoric/inter-protocol@0.13.3) (2023-02-17)

**Note:** Version bump only for package @agoric/inter-protocol





### [0.13.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.1...@agoric/inter-protocol@0.13.2) (2022-12-14)

**Note:** Version bump only for package @agoric/inter-protocol





### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.0...@agoric/inter-protocol@0.13.1) (2022-10-18)

**Note:** Version bump only for package @agoric/inter-protocol





## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.12.1...@agoric/inter-protocol@0.13.0) (2022-10-08)


### Features

* script to replace econ-gov in Core Eval ([8bcebf9](https://github.com/Agoric/agoric-sdk/commit/8bcebf95d6f93fe094bdfeab41b4bedec1ac9662))
* **governance:** replaceElectorate ([12de09e](https://github.com/Agoric/agoric-sdk/commit/12de09e03a6f52c77f2453a006164f151a2c13af))


### Bug Fixes

* strike "Initial" from Economic Committee ([0f3ce16](https://github.com/Agoric/agoric-sdk/commit/0f3ce1695635551b800f04e0e232d25e16c8f562))



### [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.12.0...@agoric/inter-protocol@0.12.1) (2022-10-05)


### Bug Fixes

* make it possible to set decimalPlaces when calling startPSM ([#6348](https://github.com/Agoric/agoric-sdk/issues/6348)) ([46aa80e](https://github.com/Agoric/agoric-sdk/commit/46aa80e1f8d8a73a8a7853ebcd937f5c2df64a42))



## 0.12.0 (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move from Schema to Shape terminology (#6072)
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **psm:** split PSM invitations to enable pausing separately (#6030)
* **store:** move some util where they are more reusable (#5990)
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment)
* **vaultFactory:** split numVaults to numActiveVaults and numLiquidatingVaults (#5917)
* **startPSM:** IST → RUN
* **run-protocol:** rename to inter-protocol

### Features

* **zoe:** expose keywords in error messages ([3c9c497](https://github.com/Agoric/agoric-sdk/commit/3c9c497b0c22bf9729cc65af26a0d6a32450a4fd))
* ensure voting via PSMCharter works with a unit test ([#6167](https://github.com/Agoric/agoric-sdk/issues/6167)) ([ff9471b](https://github.com/Agoric/agoric-sdk/commit/ff9471bf3a90ffab050e8b659d64d4cbd7c2d764))
* **inter-protocol:** introduce each PSM to the provisionPool ([3b53b9b](https://github.com/Agoric/agoric-sdk/commit/3b53b9b406ea33136fda9a5292def20f7143c7c5))
* add a continuing invitation to the voter facet ([#6092](https://github.com/Agoric/agoric-sdk/issues/6092)) ([f53470e](https://github.com/Agoric/agoric-sdk/commit/f53470ede1e58e6aebc1c4db7da4c8ecefa8b46f))
* distribute PSM Charter Invitatitons ([#6166](https://github.com/Agoric/agoric-sdk/issues/6166)) ([50cd3e2](https://github.com/Agoric/agoric-sdk/commit/50cd3e240fb33079948fa03b32bda86276879b4a))
* make PSM bootstrap support multiple brands ([#6146](https://github.com/Agoric/agoric-sdk/issues/6146)) ([d9583f8](https://github.com/Agoric/agoric-sdk/commit/d9583f88fe98eaa16b5d5147f33a99f0722453e1)), closes [#6142](https://github.com/Agoric/agoric-sdk/issues/6142) [#6139](https://github.com/Agoric/agoric-sdk/issues/6139)
* **amm:** new storageNode 'init' for immutables ([a482f82](https://github.com/Agoric/agoric-sdk/commit/a482f82f7cbe93f0ce4125c6e03eeda577322d23))
* **bootstrap:** produce testFirstAnchorKit ([219f6fd](https://github.com/Agoric/agoric-sdk/commit/219f6fd3f8fd0fe89372115ad13f4b5e531fba61))
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment) ([cc4ca9a](https://github.com/Agoric/agoric-sdk/commit/cc4ca9a51665e2d4980ade3f3803655c43ac7001))
* **inter:** board ids for STABLE ([5160b3c](https://github.com/Agoric/agoric-sdk/commit/5160b3c80c7998441edc5e90a7a1f9b65160a147))
* **liquidation:** If liquidation results in a shortfall, don't refund excess ([#5919](https://github.com/Agoric/agoric-sdk/issues/5919)) ([2e91d96](https://github.com/Agoric/agoric-sdk/commit/2e91d967ef66ea73786ddd0c181a842303f892bd))
* **psm:** far class and guard patterns ([#6119](https://github.com/Agoric/agoric-sdk/issues/6119)) ([11a17d3](https://github.com/Agoric/agoric-sdk/commit/11a17d3cf006cb097d80061234398021109dbd94)), closes [#6129](https://github.com/Agoric/agoric-sdk/issues/6129) [#6135](https://github.com/Agoric/agoric-sdk/issues/6135)
* charter for the PSM, enabling governance ([#6090](https://github.com/Agoric/agoric-sdk/issues/6090)) ([e80b763](https://github.com/Agoric/agoric-sdk/commit/e80b7639e45647d54873c5d24ab9e98bd47b9679))
* save PSM adminFacet in bootstrap ([#6101](https://github.com/Agoric/agoric-sdk/issues/6101)) ([14b20e6](https://github.com/Agoric/agoric-sdk/commit/14b20e6054703240754695ba3ba385d0e954d41c))
* **governance:** questions to off-chain storage ([5bf276b](https://github.com/Agoric/agoric-sdk/commit/5bf276b79d062c05a43666f4fc8622c177b53d2f))
* **inter-protocol:** add amm liquidity script ([#5938](https://github.com/Agoric/agoric-sdk/issues/5938)) ([d0f0f7a](https://github.com/Agoric/agoric-sdk/commit/d0f0f7a76b55291f6bd1cec4f95bfae72496dbc4))
* **inter-protocol:** support committee question publishing ([91dec79](https://github.com/Agoric/agoric-sdk/commit/91dec791d7c77c6a92263951ffbb0aaa7c7ebfbe))
* **priceAggregator:** publish quotes ([d4054d9](https://github.com/Agoric/agoric-sdk/commit/d4054d98bd5a094b45ed2e3e70bb1ff997f4b2c5))
* **psm:** metrics to off-chain storage ([6a5d862](https://github.com/Agoric/agoric-sdk/commit/6a5d862a91daed8f626d8c594c1dff7b8c306062))
* **run-protocol:** calculateCurrentDebt util ([ce2c5e8](https://github.com/Agoric/agoric-sdk/commit/ce2c5e89301775df2b9e3d26e662a80f96ba424f))
* **vats:** makeMockChainStorageRoot test util ([7e48be3](https://github.com/Agoric/agoric-sdk/commit/7e48be3ae25b1dcc77b729e890d5792d8ff36c01))
* **vaultFactory:** split numVaults to numActiveVaults and numLiquidatingVaults ([#5917](https://github.com/Agoric/agoric-sdk/issues/5917)) ([9b20d03](https://github.com/Agoric/agoric-sdk/commit/9b20d0328dc73a9541492f4f87221b3fe8b6a395))
* **zoe:** unitAmount helper ([9007f4c](https://github.com/Agoric/agoric-sdk/commit/9007f4c5710f65566842559680f7a0557f57398d))


### Bug Fixes

* **psm:** "mint" limits for IST rather than anchor ([413c104](https://github.com/Agoric/agoric-sdk/commit/413c104436d7a9d725c99463ed7c2fe385c8d2fc))
* **psm:** fully integrate mintedPoolBalance ([9d6d724](https://github.com/Agoric/agoric-sdk/commit/9d6d7243d185fec0a9d6467ac0500f86e8bb9547))
* **psmCharter:** ParamChangesOfferArgsShape path ([c113ff0](https://github.com/Agoric/agoric-sdk/commit/c113ff09d6008d93f72840c1fad525cba97b32a7))
* avoid relying on bound `E` proxy methods ([#5998](https://github.com/Agoric/agoric-sdk/issues/5998)) ([497d157](https://github.com/Agoric/agoric-sdk/commit/497d157d29cc8dda58eca9e07c24b57731647074))
* better mismatch errors ([#5947](https://github.com/Agoric/agoric-sdk/issues/5947)) ([46e34f6](https://github.com/Agoric/agoric-sdk/commit/46e34f6deb7e5d8210a227bdea32fe3e2296e9ef))
* Better pattern mismatch diagnostics ([#5906](https://github.com/Agoric/agoric-sdk/issues/5906)) ([cf97ba3](https://github.com/Agoric/agoric-sdk/commit/cf97ba310fb5eb5f1ff5946d7104fdf27bcccfd4))
* bug in M.setOf and M.bagOf ([#5952](https://github.com/Agoric/agoric-sdk/issues/5952)) ([c940736](https://github.com/Agoric/agoric-sdk/commit/c940736dae49a1d3095194839dae355d4db2a67f))
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* Fix test failures in packages other than "vats" ([364815b](https://github.com/Agoric/agoric-sdk/commit/364815b88429e3443734681b5b0771b7d824ebe8))
* prepare for inherited method representation ([#5989](https://github.com/Agoric/agoric-sdk/issues/5989)) ([348b860](https://github.com/Agoric/agoric-sdk/commit/348b860c62d9479962df268cfb1795b6c369c2b8))
* psmCharter.addInstance interface shape correction ([00e631d](https://github.com/Agoric/agoric-sdk/commit/00e631de2b54f84343024aa78b06a5f27f9689ac))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **inter-protocol:** ensure PSM availability after failure ([7f0f8fd](https://github.com/Agoric/agoric-sdk/commit/7f0f8fdfebe8c843ee0b40f2b88717ab680c2354))
* **inter-protocol:** introduce each PSM to the psmCharter ([48be0f8](https://github.com/Agoric/agoric-sdk/commit/48be0f8ce62edc6c14164e8dfb67cf955e7366cd))
* rewrite zoe/tools/manualTimer.js, update tests ([0b5df16](https://github.com/Agoric/agoric-sdk/commit/0b5df16f83629efb7cb48d54250139e082ed109c))
* **inter-protocol:** settle issuers before adding to agoricNames ([2d21478](https://github.com/Agoric/agoric-sdk/commit/2d21478c02d551227c887d69621f2205ef6f3f48))
* **startPSM:** IST → RUN ([20fb445](https://github.com/Agoric/agoric-sdk/commit/20fb445b5e6ef56b781531f1ae050fbd7ca16e36))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* time as branded value ([#5821](https://github.com/Agoric/agoric-sdk/issues/5821)) ([34078ff](https://github.com/Agoric/agoric-sdk/commit/34078ff4b34a498f96f3cb83df3a0b930b98bbec))
* userSeat allocation only for testing ([#5826](https://github.com/Agoric/agoric-sdk/issues/5826)) ([9cb561b](https://github.com/Agoric/agoric-sdk/commit/9cb561b39d56cc54e87258980d333d912e837f38))
* **vault:** move outerUpdater out of durable state ([3fa2e58](https://github.com/Agoric/agoric-sdk/commit/3fa2e588911c877d9e463cf860215c6f91a32d2f))
* **vault:** zcf non-durable ([b74cdc6](https://github.com/Agoric/agoric-sdk/commit/b74cdc6220ceaf5f16289898bcde74637eabe8d0))


### Code Refactoring

* **psm:** split PSM invitations to enable pausing separately ([#6030](https://github.com/Agoric/agoric-sdk/issues/6030)) ([45bc8a1](https://github.com/Agoric/agoric-sdk/commit/45bc8a1896c5f51b6fb41863b50fd16c18cfcdff))
* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))
* **store:** move from Schema to Shape terminology ([#6072](https://github.com/Agoric/agoric-sdk/issues/6072)) ([757b887](https://github.com/Agoric/agoric-sdk/commit/757b887edd2d41960fadc86d4900ebde55729867))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



## [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.10.0...@agoric/run-protocol@0.11.0) (2022-05-28)


### ⚠ BREAKING CHANGES

* **amm:** push reserved assets to reserve contract (#5429)
* **AMM:** make amm.addPool() require minimum collateral (#5377)

### Features

* **amm:** push reserved assets to reserve contract ([#5429](https://github.com/Agoric/agoric-sdk/issues/5429)) ([20472a1](https://github.com/Agoric/agoric-sdk/commit/20472a1924352df1611ed408c420ac0c56457fc7))
* **AMM:** make amm.addPool() require minimum collateral ([#5377](https://github.com/Agoric/agoric-sdk/issues/5377)) ([2fedea6](https://github.com/Agoric/agoric-sdk/commit/2fedea666d6730c852aee49c045449aa5d8bebb5)), closes [#4643](https://github.com/Agoric/agoric-sdk/issues/4643) [#5397](https://github.com/Agoric/agoric-sdk/issues/5397)
* **core-proposal:** provide an `overrideManifest` to make the manifest explicit ([6557ecf](https://github.com/Agoric/agoric-sdk/commit/6557ecfb965fd668cf9538132e63a0419b86bd54))
* **feeDistributor:** new `run-protocol` Zoe contract ([b5d9869](https://github.com/Agoric/agoric-sdk/commit/b5d9869049e42319d8df529bc274e487e77493ad))
* **liquidation:** push penalties to reserve ([b431916](https://github.com/Agoric/agoric-sdk/commit/b43191627cee20c5631fffc5786807b01673fc20))
* **reserve:** always accept RUN ([f803755](https://github.com/Agoric/agoric-sdk/commit/f80375584953d591ec39b7370fbb3f386e6d6d12))
* **Reserve:** Reserve can burn RUN  to reduce shortfall ([#5444](https://github.com/Agoric/agoric-sdk/issues/5444)) ([1f75135](https://github.com/Agoric/agoric-sdk/commit/1f75135b16893a2efacc6bb23011a5e910489ccf))
* **run-protocol:** support $MIN_INITIAL_POOL_LIQUIDITY esp 0 ([1507ed6](https://github.com/Agoric/agoric-sdk/commit/1507ed6857029dbe8e96df8d7d14773e0f8ccacc))
* Reserves track liquidation shortfall ([#5431](https://github.com/Agoric/agoric-sdk/issues/5431)) ([1d8093d](https://github.com/Agoric/agoric-sdk/commit/1d8093dd426b4ca6cf71a94c71b6f9599eefe532))
* **cosmic-swingset:** implement `make scenario2-run-chain-economy` ([82a6ee9](https://github.com/Agoric/agoric-sdk/commit/82a6ee9edba0eec562e12bd325b893010ddb94ce))
* **run-protocol:** add `scripts/manual-price-feed.js` ([8f3da47](https://github.com/Agoric/agoric-sdk/commit/8f3da47fac23ba947a5fac196ce14fd0d57b89d2))
* **run-protocol:** fix committee-proposal.js ([ef9a1f6](https://github.com/Agoric/agoric-sdk/commit/ef9a1f646a627d06a20ffe2baf3b1f8ac81533c8))
* **run-protocol:** have behaviours allow more customisation ([761661d](https://github.com/Agoric/agoric-sdk/commit/761661d2722e111f207eea5179cd43ee971a5289))
* **run-protocol:** price feed core and proposal ([4b96bb6](https://github.com/Agoric/agoric-sdk/commit/4b96bb686fea8959ee9d34517eb59594063cdf59))
* **run-protocol:** restructure core-proposals ([4e902a6](https://github.com/Agoric/agoric-sdk/commit/4e902a6a16f5780afea49a14e13116a1a7583a1c))
* **run-protocol:** support core-proposal args ([d3d8927](https://github.com/Agoric/agoric-sdk/commit/d3d8927e1a8155176c8da8ea2bf96b20ce8d91ff))
* **vats:** separate reserve and reward streams ([8303c97](https://github.com/Agoric/agoric-sdk/commit/8303c9750b7ea2e3c455d0ba155d806563507bbc))
* **vault:** econ metrics notifiers ([#5260](https://github.com/Agoric/agoric-sdk/issues/5260)) ([6c3cdf3](https://github.com/Agoric/agoric-sdk/commit/6c3cdf37234c3053f7dfcd745e21ae78d828ad0b))
* **vault:** liquidation penalty handled by liquidation contracts ([#5343](https://github.com/Agoric/agoric-sdk/issues/5343)) ([ce1cfaf](https://github.com/Agoric/agoric-sdk/commit/ce1cfafb6d375453865062e1bd66ade66fb80686))
* **vaultManager:** expose liquidation metrics ([#5393](https://github.com/Agoric/agoric-sdk/issues/5393)) ([47d4823](https://github.com/Agoric/agoric-sdk/commit/47d48236ee1702d8b0a903e39143132b56cfd096))
* permissionless interchain AMM pool creation ([5e2a8d0](https://github.com/Agoric/agoric-sdk/commit/5e2a8d09403e237b832ab4a26419e219f3f51969))
* publish econ stats from AMM ([#5420](https://github.com/Agoric/agoric-sdk/issues/5420)) ([87a9e62](https://github.com/Agoric/agoric-sdk/commit/87a9e628315948fa75e78bf5294178f65bc34b56)), closes [#4648](https://github.com/Agoric/agoric-sdk/issues/4648) [#5377](https://github.com/Agoric/agoric-sdk/issues/5377)


### Bug Fixes

* **addAssetToVault:** dangling promises ([d37dd78](https://github.com/Agoric/agoric-sdk/commit/d37dd7846f1258ffba291b6a9cbc94fb01e95e16))
* **addAssetToVault:** use unit values to generate the scaling ratios ([7259bbe](https://github.com/Agoric/agoric-sdk/commit/7259bbe7e07e61ec946401940e172e786e88ebf1))
* **amm:** don't require {want:{Liquidity}} when adding liquidity ([e768c91](https://github.com/Agoric/agoric-sdk/commit/e768c91b834377018fafea150150d2c122358baa))
* **amm:** update metrics whenever pool balances change, including init ([001280b](https://github.com/Agoric/agoric-sdk/commit/001280b7d9d8aeb0af17ba590cdde8ff6932ef6f))
* **AMM:** await zcf.saveIssuer() ([03b597e](https://github.com/Agoric/agoric-sdk/commit/03b597e17d9e185e289e067a83b31248daee6081))
* **interchainPool:** get MinInitialLiquidity from AMM on demand ([#5423](https://github.com/Agoric/agoric-sdk/issues/5423)) ([1f849a3](https://github.com/Agoric/agoric-sdk/commit/1f849a3edece3883dd03548825f744af6d00b686))
* **run-protocol:** adapt startPSM to core proposal conventions ([4e47405](https://github.com/Agoric/agoric-sdk/commit/4e474050d42727a2527026251fa40dd35a0db105))
* **run-protocol:** raise demo issuer debt limit ([129826c](https://github.com/Agoric/agoric-sdk/commit/129826c3a14021292227993a28012c1ce41fd146))
* **run-protocol:** reinstate option to publish interchain asset from bank ([0672139](https://github.com/Agoric/agoric-sdk/commit/0672139619cf9e3ef4007700e9e05c82e742e0c5))
* vault proposal relies on permissionless IBC AMM pool creation ([4e711b1](https://github.com/Agoric/agoric-sdk/commit/4e711b1e6009e02bd2e4e642d8c39158182336a7))



## [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.9.0...@agoric/run-protocol@0.10.0) (2022-05-09)


### ⚠ BREAKING CHANGES

* impose a minimum loan size when opening a vault (#5235)

### Features

* extract committee invitation as deploy script ([7d52883](https://github.com/Agoric/agoric-sdk/commit/7d52883844af1a41a0b1095a290069de1470f4f5))
* **bundleTool:** makeNodeBundleCache uses explicit authority ([bbb7e02](https://github.com/Agoric/agoric-sdk/commit/bbb7e02d34c59e2a8c7f743a2ca28727da5bc67e))
* **run-protocol:** gov-inviteCommittee.js for agoricdev-10 ([af21f22](https://github.com/Agoric/agoric-sdk/commit/af21f22e8e7c1649b13661312a58de54d51d11fa))
* add a contract that supports voting on economic contracts ([e3f77ef](https://github.com/Agoric/agoric-sdk/commit/e3f77ef788d7c85d55e07adfd52f24158d0eec85))
* impose a minimum loan size when opening a vault ([#5235](https://github.com/Agoric/agoric-sdk/issues/5235)) ([4a2edd3](https://github.com/Agoric/agoric-sdk/commit/4a2edd32b187604e11a1b530e6e5703994813017)), closes [#4967](https://github.com/Agoric/agoric-sdk/issues/4967)
* **amm:** support `maxOut` optional arg to `swap` ([#5125](https://github.com/Agoric/agoric-sdk/issues/5125)) ([54151ac](https://github.com/Agoric/agoric-sdk/commit/54151ac5aa468abedae0b535d35df3535c4ad727))
* **psm:** governance ([086674c](https://github.com/Agoric/agoric-sdk/commit/086674c28b607f344e22c8df5a82ff46a3255622))
* **run-protocol:** collect runStake fees ([#5197](https://github.com/Agoric/agoric-sdk/issues/5197)) ([ac1b9c8](https://github.com/Agoric/agoric-sdk/commit/ac1b9c8418cf603d96f498aac199c21686d4672d))
* **run-protocol:** convert RunStakeManager to vobj ([#5135](https://github.com/Agoric/agoric-sdk/issues/5135)) ([6b912b4](https://github.com/Agoric/agoric-sdk/commit/6b912b4f1f96a0b22e776246e232cc1a61d6d60a)), closes [#5106](https://github.com/Agoric/agoric-sdk/issues/5106)
* **run-protocol:** runStake, PSM bootstrap ([2c98994](https://github.com/Agoric/agoric-sdk/commit/2c98994819bc7947ffbfb5318050f371e10e2ea4))
* **vault:** governance upgrade of liquidation ([#5211](https://github.com/Agoric/agoric-sdk/issues/5211)) ([35e1b7d](https://github.com/Agoric/agoric-sdk/commit/35e1b7d0b7df2508adf0d46a83944e94ab95951a))
* **vault:** Liquidate incrementally ([#5129](https://github.com/Agoric/agoric-sdk/issues/5129)) ([b641269](https://github.com/Agoric/agoric-sdk/commit/b64126996d4844c07016deadc87269dc387c4aae))
* virtualize pools for the AMM. ([#5187](https://github.com/Agoric/agoric-sdk/issues/5187)) ([e2338e9](https://github.com/Agoric/agoric-sdk/commit/e2338e98b64b59920a13faeacb29ae7868c3693b))


### Bug Fixes

* **econCommitteeCharter:** missing deadline param ([1669588](https://github.com/Agoric/agoric-sdk/commit/1669588d96929b5b6e427affcf30b51a882f47c4))
* **extract-proposal:** coreProposal source paths were leaked onto the chain ([acc6672](https://github.com/Agoric/agoric-sdk/commit/acc66729cfa8459ef549b96f6fbeed1d55a4be3f))
* addPool takes an issuer ([9a9eb43](https://github.com/Agoric/agoric-sdk/commit/9a9eb436007b83adb3a18551d9d7510b9be91ecc))
* typo in invite-committee-core.js ([ebbb3ff](https://github.com/Agoric/agoric-sdk/commit/ebbb3ff64d89cd34a7e30324be2af7b15eb23ef6))
* **attestation:** handle return of empty attestation ([11164bb](https://github.com/Agoric/agoric-sdk/commit/11164bbe8695825bcadcf09bba3bb59114256a41))
* **bundleTool:** don't ignore module path in metadata check ([#5199](https://github.com/Agoric/agoric-sdk/issues/5199)) ([540978c](https://github.com/Agoric/agoric-sdk/commit/540978c997e30c25905ea1fb837ae701db6f3536)), closes [#5129](https://github.com/Agoric/agoric-sdk/issues/5129) [/github.com/Agoric/agoric-sdk/pull/5129/commits/00d32a7e84d8d4fd9309a1e115145d5164c93b19#r854207585](https://github.com/Agoric//github.com/Agoric/agoric-sdk/pull/5129/commits/00d32a7e84d8d4fd9309a1e115145d5164c93b19/issues/r854207585)
* **run-protocol:** complete permits for startRewardDistributor, makeAnchorAsset ([#5213](https://github.com/Agoric/agoric-sdk/issues/5213)) ([2b2c966](https://github.com/Agoric/agoric-sdk/commit/2b2c9666f5cb51f584ab04f187aa12c03f415437))
* **run-protocol:** PSM governance, anchor mintHolder ([cb8f68b](https://github.com/Agoric/agoric-sdk/commit/cb8f68b10c0351c6d5d04a06cd31a4fefb0e5043))
* **run-protocol:** restore wrapLienedAmount on AttestationTool ([1445997](https://github.com/Agoric/agoric-sdk/commit/14459974e7b78f646b792bc7c5033cba5c6ed31c))
* reconcile use of path to paramManager vaults with others ([#5151](https://github.com/Agoric/agoric-sdk/issues/5151)) ([b5d1439](https://github.com/Agoric/agoric-sdk/commit/b5d14393d407a7d7dca42ff5e41d374613168cbc))
* **run-protocol:** vault debt ratio ordering after interest charges ([#5149](https://github.com/Agoric/agoric-sdk/issues/5149)) ([2c9a5d0](https://github.com/Agoric/agoric-sdk/commit/2c9a5d0e07b0886ba6cbfd38ec6d321f1e42a4fb))



## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.8.0...@agoric/run-protocol@0.9.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* atomically update multiple parameters via governance (#5063)
* fix a bug in addLiquidity (#5091)
* add collateral Reserve to hold collateral and add to AMM under governance control (#4635)
* add the ability to invoke an API to contract governance (#4869)
* **run-protocol:** vaults hold liquidation proceeds until closed
* **run-protocol:** return assetNotifier instead of notifying on uiNotifier
* **run-protocol:** rename uiNotifier to vaultNotifier
* consistent Node engine requirement (>=14.15.0)
* **run-protocol:** remove liquidated flag from vault notifications

### Features

* **bundleTool:** memoize load() ([9624665](https://github.com/Agoric/agoric-sdk/commit/96246659ebe9baef4fbabb02ffe3e74210428537))
* **run-protocol:** charge penalty for liquidation ([#4996](https://github.com/Agoric/agoric-sdk/issues/4996)) ([5467be4](https://github.com/Agoric/agoric-sdk/commit/5467be4fb5c4cc47f34736eb669e207b26eb711d))
* **run-protocol:** debt limit for RUNstake ([c6a2b68](https://github.com/Agoric/agoric-sdk/commit/c6a2b6825c40b94e03a2bd5c34be7aad473e54a6))
* **run-protocol:** debtLimit governed param ([#4948](https://github.com/Agoric/agoric-sdk/issues/4948)) ([161e968](https://github.com/Agoric/agoric-sdk/commit/161e9689ea13fae8559a8915a87a5ec031969d5f))
* **run-protocol:** expose wrapLienedAmount on attestationTool ([766984e](https://github.com/Agoric/agoric-sdk/commit/766984e5f4265731abbd4ef826f180c568838d91))
* **run-protocol:** first cut at governance-induced RUN ([7500218](https://github.com/Agoric/agoric-sdk/commit/75002188c106370bc0b3d71ecb8b9a2ecb00ac8d))
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)
* split single- and multi-faceted VO definitions into their own functions ([fcf293a](https://github.com/Agoric/agoric-sdk/commit/fcf293a4fcdf64bf30b377c7b3fb8b728efbb4af)), closes [#5093](https://github.com/Agoric/agoric-sdk/issues/5093)
* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
* **cosmic-swingset:** grant addVaultType based on addr ([#4641](https://github.com/Agoric/agoric-sdk/issues/4641)) ([e439024](https://github.com/Agoric/agoric-sdk/commit/e439024788f27ea668b2ff0c5e486ab901807eb0))
* **run-protocol:** distinct vault phase for liquidated ([26593e4](https://github.com/Agoric/agoric-sdk/commit/26593e4eca7aa7997d56470c7892c30d6d9b6f93))
* **run-protocol:** liquidate serially ([#4931](https://github.com/Agoric/agoric-sdk/issues/4931)) ([91a62a5](https://github.com/Agoric/agoric-sdk/commit/91a62a57b34a4967209f1a7f88ea5dd0a085fb46)), closes [#4715](https://github.com/Agoric/agoric-sdk/issues/4715)
* **run-protocol:** RUNstake contract only, without payoff from rewards ([#4741](https://github.com/Agoric/agoric-sdk/issues/4741)) ([52f60eb](https://github.com/Agoric/agoric-sdk/commit/52f60eb192217ff3e4cf84a5a2ff8ada19fb5dcc))
* add collateral Reserve to hold collateral and add to AMM under governance control ([#4635](https://github.com/Agoric/agoric-sdk/issues/4635)) ([3e3f55f](https://github.com/Agoric/agoric-sdk/commit/3e3f55f48365d614c2215d8f311f973ff54b6cd0)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188) [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)
* add the ability to invoke an API to contract governance ([#4869](https://github.com/Agoric/agoric-sdk/issues/4869)) ([3123665](https://github.com/Agoric/agoric-sdk/commit/312366518471238430c79313f79e57aee1c551cd)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)


### Bug Fixes

* **bundleTool:** harden loaded bundles ([d77cea2](https://github.com/Agoric/agoric-sdk/commit/d77cea26f50e46833cd5cbde780f6393e616a4ec))
* **run-protocol:** more support for governance boot ([711d80d](https://github.com/Agoric/agoric-sdk/commit/711d80d6f4b854ca9dadb0bae764a9a0cc65fa59))
* **run-protocol:** re-structure vault notifiers to work with wallet ([9ac3f00](https://github.com/Agoric/agoric-sdk/commit/9ac3f00462cff6cfc20ab3325dad6798f3a8560f))
* **run-protocol:** shuffle around to fix types ([1c06bbd](https://github.com/Agoric/agoric-sdk/commit/1c06bbd71c39b09bb0e8007b0a96febf3bfbd771))
* **run-protocol:** store Presences, not Promises, in VaultManager ([5aee8af](https://github.com/Agoric/agoric-sdk/commit/5aee8af34fb1fab54633fc9a1acbf2818414de9a)), closes [#5106](https://github.com/Agoric/agoric-sdk/issues/5106) [#5121](https://github.com/Agoric/agoric-sdk/issues/5121) [#5106](https://github.com/Agoric/agoric-sdk/issues/5106)
* **run-protocol:** use wallet-friendly offer result notifiers ([b08330b](https://github.com/Agoric/agoric-sdk/commit/b08330b5bbb040979a68c19c8609e715e468b905))
* **vaults:** check args before acting in addVaultType ([12d5cfb](https://github.com/Agoric/agoric-sdk/commit/12d5cfbc9abfa553e40b7b458ce99420c7c54a85))
* Encode Passables, not just keys ([#4470](https://github.com/Agoric/agoric-sdk/issues/4470)) ([715950d](https://github.com/Agoric/agoric-sdk/commit/715950d6bfcbe6bc778b65a256dc5d26299172db))
* fix a bug in addLiquidity ([#5091](https://github.com/Agoric/agoric-sdk/issues/5091)) ([512db54](https://github.com/Agoric/agoric-sdk/commit/512db545c4e88fa4126c44a29f3a8775c330264f))
* renamings [#4470](https://github.com/Agoric/agoric-sdk/issues/4470) missed ([#4896](https://github.com/Agoric/agoric-sdk/issues/4896)) ([98c9f0e](https://github.com/Agoric/agoric-sdk/commit/98c9f0eabf6f0a85581e34ca0adf24f9805d1f0c))
* two isolated cases where a missing argument did not default ([531d367](https://github.com/Agoric/agoric-sdk/commit/531d367600e97652babff1ee8ffa4e4665f50baa))
* update types to specify ERef<Issuer> on addPool() ([6c13d99](https://github.com/Agoric/agoric-sdk/commit/6c13d997f89d914516dd6d4821d95364bd715b39)), closes [#4810](https://github.com/Agoric/agoric-sdk/issues/4810)
* **vats:** move `startPriceAuthority` earlier in the boot sequence ([bf93171](https://github.com/Agoric/agoric-sdk/commit/bf93171c69eb1a19b04c24c9283e0d433ca9d411))
* **vault:** make vault transfer invitation legible ([#4844](https://github.com/Agoric/agoric-sdk/issues/4844)) ([325ef39](https://github.com/Agoric/agoric-sdk/commit/325ef399cc9b65eedca71c2d2d7c42a4c6ec5191))
* **zoe:** pass brands (not issuers) to priceAggregator ([5800711](https://github.com/Agoric/agoric-sdk/commit/580071189bb60d83ceaa806bf85035173ae9563c))


### Reverts

* Revert "refactor(run-protocol): virtual kind for vault manager (#5052)" ([b08dc58](https://github.com/Agoric/agoric-sdk/commit/b08dc5836e8bea98de4316edc7ac5eef698c7072)), closes [#5052](https://github.com/Agoric/agoric-sdk/issues/5052)


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))
* **run-protocol:** remove liquidated flag from vault notifications ([6456af2](https://github.com/Agoric/agoric-sdk/commit/6456af25e154f01820efbdc1afb343902e385384))


### Code Refactoring

* atomically update multiple parameters via governance ([#5063](https://github.com/Agoric/agoric-sdk/issues/5063)) ([8921f59](https://github.com/Agoric/agoric-sdk/commit/8921f59bcdf217b311670c509b8500074eafd77a))
* **run-protocol:** rename uiNotifier to vaultNotifier ([554d41e](https://github.com/Agoric/agoric-sdk/commit/554d41ed9f9b35cd59133818e428d3055006e1ca))
* **run-protocol:** return assetNotifier instead of notifying on uiNotifier ([35d2d41](https://github.com/Agoric/agoric-sdk/commit/35d2d41f5345f593a647390c6f3dee5ccb44bf15))
* **run-protocol:** vaults hold liquidation proceeds until closed ([de32be9](https://github.com/Agoric/agoric-sdk/commit/de32be9b27780e75b70f06780872994fce7da02a))



## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.7.2...@agoric/run-protocol@0.8.0) (2022-02-24)


### ⚠ BREAKING CHANGES

* **run-protocol:** removes getBootstrapPayment from VaultFactory

### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)
* **run-protocol:** startRewardDistributor bootstrap behavior ([ad038ff](https://github.com/Agoric/agoric-sdk/commit/ad038ffa831f6be858cb2ebe8a429557e09186c2))


### Bug Fixes

* **run-protocol:** harden results from collection utilities ([5d8b4c1](https://github.com/Agoric/agoric-sdk/commit/5d8b4c14e798be5358530c5b0f7b5b59505431c9))
* **run-protocol:** produce priceAuthorityVat for fake authorities ([ba1b367](https://github.com/Agoric/agoric-sdk/commit/ba1b36792d45e96a8746e9b62b488cb404a2c72b))


### Miscellaneous Chores

* **run-protocol:** centralSupply contract for bootstrapPayment ([e526a7d](https://github.com/Agoric/agoric-sdk/commit/e526a7d8f01811560804cb48f77fce1347d8836b)), closes [#4021](https://github.com/Agoric/agoric-sdk/issues/4021)



### 0.7.2 (2022-02-21)


### Features

* **run-protocol:** interest charging O(1) for all vaults in a manager ([#4527](https://github.com/Agoric/agoric-sdk/issues/4527)) ([58103ac](https://github.com/Agoric/agoric-sdk/commit/58103ac216f4ce28cbbe73494af2ea11b5a110c0))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))
* **run-protocol:** variable rate vault/loan ([54d509e](https://github.com/Agoric/agoric-sdk/commit/54d509e74517c4385183b13cbf30c2976944ddd0))


### Bug Fixes

* dropping the max on the property-based tests led to problems ([#4600](https://github.com/Agoric/agoric-sdk/issues/4600)) ([3ddd160](https://github.com/Agoric/agoric-sdk/commit/3ddd160f343a7ad6faebeee8e09787310a63e211))
* Remove extraneous eslint globals ([17087e4](https://github.com/Agoric/agoric-sdk/commit/17087e4605db7d3b30dfccf2434b2850b45e3408))
* **amm:** Prevent creation of constant product AMM with non-fungible central token ([#4476](https://github.com/Agoric/agoric-sdk/issues/4476)) ([4f2d036](https://github.com/Agoric/agoric-sdk/commit/4f2d03612b2130c3fa053d239bde0c927245d1ff))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* when trades for zero are requested don't throw ([4516e5b](https://github.com/Agoric/agoric-sdk/commit/4516e5b6a2ab9176033956ee197687b5c6574647))
* **run-protocol:** update `makeRatio` import ([20965f1](https://github.com/Agoric/agoric-sdk/commit/20965f14c2212024cee9796a2454b5435aa3fcb8))



### [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.7.0...@agoric/treasury@0.7.1) (2021-12-22)


### Features

* refactor parameter governance support to allow for Invitations ([#4121](https://github.com/Agoric/agoric-sdk/issues/4121)) ([159596b](https://github.com/Agoric/agoric-sdk/commit/159596b8d44b8cbdaf6e19513cb3e716febfae7b))


### Bug Fixes

* **treasury:** use liquidationMargin for maxDebt calculation ([#4163](https://github.com/Agoric/agoric-sdk/issues/4163)) ([c749af8](https://github.com/Agoric/agoric-sdk/commit/c749af86232029c0abc8b031366251a05e482930))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.5...@agoric/treasury@0.7.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **zoe:** must harden `amountKeywordRecord` before passing to ZCF objects

* chore: fix treasury errors, etc.

Co-authored-by: mergify[bot] <37929162+mergify[bot]@users.noreply.github.com>
* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Bug Fixes

* **zoe:** assert that amountKeywordRecord is a copyRecord ([#4069](https://github.com/Agoric/agoric-sdk/issues/4069)) ([fe9a9ff](https://github.com/Agoric/agoric-sdk/commit/fe9a9ff3de86608a0b1f8f9547059f89d45b948d))


### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.6.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.4...@agoric/treasury@0.6.5) (2021-10-13)

**Note:** Version bump only for package @agoric/treasury





### [0.6.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.3...@agoric/treasury@0.6.4) (2021-09-23)

**Note:** Version bump only for package @agoric/treasury





### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.2...@agoric/treasury@0.6.3) (2021-09-15)

**Note:** Version bump only for package @agoric/treasury





### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.1...@agoric/treasury@0.6.2) (2021-08-21)

**Note:** Version bump only for package @agoric/treasury





### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.0...@agoric/treasury@0.6.1) (2021-08-18)

**Note:** Version bump only for package @agoric/treasury





## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.12...@agoric/treasury@0.6.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Features

* **treasury:** assert getBootstrapPayment amount ([3ed8e69](https://github.com/Agoric/agoric-sdk/commit/3ed8e695deb9a0f6c5d924374e61ceb8d9aaff1c))


### Bug Fixes

* return funds from liquidation via a seat payout ([#3656](https://github.com/Agoric/agoric-sdk/issues/3656)) ([d1a142d](https://github.com/Agoric/agoric-sdk/commit/d1a142d47ae0cf3db6512e85ac2de583193a2fdf))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.5.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.11...@agoric/treasury@0.5.12) (2021-08-16)

**Note:** Version bump only for package @agoric/treasury





### [0.5.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.11) (2021-08-15)


### Bug Fixes

* Treasury burn debt repayment before zeroing the amount owed ([#3604](https://github.com/Agoric/agoric-sdk/issues/3604)) ([f0bc4cb](https://github.com/Agoric/agoric-sdk/commit/f0bc4cb0c7e419cafc0105869d287d571202448d)), closes [#3495](https://github.com/Agoric/agoric-sdk/issues/3495)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.10) (2021-08-14)


### Bug Fixes

* Treasury burn debt repayment before zeroing the amount owed ([#3604](https://github.com/Agoric/agoric-sdk/issues/3604)) ([f0bc4cb](https://github.com/Agoric/agoric-sdk/commit/f0bc4cb0c7e419cafc0105869d287d571202448d)), closes [#3495](https://github.com/Agoric/agoric-sdk/issues/3495)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.9) (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.7...@agoric/treasury@0.5.8) (2021-07-01)

**Note:** Version bump only for package @agoric/treasury





### [0.5.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.6...@agoric/treasury@0.5.7) (2021-07-01)

**Note:** Version bump only for package @agoric/treasury





### [0.5.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.5...@agoric/treasury@0.5.6) (2021-06-28)

**Note:** Version bump only for package @agoric/treasury





### [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.4...@agoric/treasury@0.5.5) (2021-06-25)

**Note:** Version bump only for package @agoric/treasury





### [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.3...@agoric/treasury@0.5.4) (2021-06-24)

**Note:** Version bump only for package @agoric/treasury





### [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.2...@agoric/treasury@0.5.3) (2021-06-24)

**Note:** Version bump only for package @agoric/treasury





### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.1...@agoric/treasury@0.5.2) (2021-06-23)

**Note:** Version bump only for package @agoric/treasury





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.0...@agoric/treasury@0.5.1) (2021-06-16)

**Note:** Version bump only for package @agoric/treasury





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.2...@agoric/treasury@0.5.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **zoe:** new reallocate API to assist with reviewing conservation of rights (#3184)

### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))


### Code Refactoring

* **zoe:** new reallocate API to assist with reviewing conservation of rights ([#3184](https://github.com/Agoric/agoric-sdk/issues/3184)) ([f34e5ea](https://github.com/Agoric/agoric-sdk/commit/f34e5eae0812a9823d40d2d05ba98522c7846f2a))



## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.1...@agoric/treasury@0.4.2) (2021-05-10)

**Note:** Version bump only for package @agoric/treasury





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.0...@agoric/treasury@0.4.1) (2021-05-05)

**Note:** Version bump only for package @agoric/treasury





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.4...@agoric/treasury@0.4.0) (2021-05-05)


### Bug Fixes

* default and propagate the poolFee and protocolFee in treasury ([d210bcf](https://github.com/Agoric/agoric-sdk/commit/d210bcf1427bee73c9a13f0a00ee2a757d978cd2))
* have the treasury use the newSwap AMM implementation ([ed6b84a](https://github.com/Agoric/agoric-sdk/commit/ed6b84ad02cdf59431aa92d3d1e8c8e669379881))
* polishing touches ([334a253](https://github.com/Agoric/agoric-sdk/commit/334a253c02dc1c74117237f6ae18b31505e635af))


### Features

* share one instance of liquidation across all vaultManagers ([#2869](https://github.com/Agoric/agoric-sdk/issues/2869)) ([0ae776a](https://github.com/Agoric/agoric-sdk/commit/0ae776a91d0ec77443073f6340e714b8e161e062))





## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.3...@agoric/treasury@0.3.4) (2021-04-22)

**Note:** Version bump only for package @agoric/treasury





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.2...@agoric/treasury@0.3.3) (2021-04-18)

**Note:** Version bump only for package @agoric/treasury





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.1...@agoric/treasury@0.3.2) (2021-04-16)

**Note:** Version bump only for package @agoric/treasury





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.0...@agoric/treasury@0.3.1) (2021-04-14)

**Note:** Version bump only for package @agoric/treasury





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.2.1...@agoric/treasury@0.3.0) (2021-04-13)


### Features

* move Pegasus contract to SDK ([d0ca2cc](https://github.com/Agoric/agoric-sdk/commit/d0ca2cc155953c63eef5f56f236fa9280984730a))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.2.0...@agoric/treasury@0.2.1) (2021-04-07)

**Note:** Version bump only for package @agoric/treasury





# 0.2.0 (2021-04-06)


### Bug Fixes

* allow liq margin plus fees for new loans ([#2813](https://github.com/Agoric/agoric-sdk/issues/2813)) ([5284548](https://github.com/Agoric/agoric-sdk/commit/52845480aa18dd76165b7997bcb2b4fad3e7c3be))
* improve factoring and assertions ([e7b356d](https://github.com/Agoric/agoric-sdk/commit/e7b356d608e7a774fb326e0b8988c7c79b938e72))
* update install-on-chain to use RUN instead of SCONES ([#2815](https://github.com/Agoric/agoric-sdk/issues/2815)) ([6ba74e9](https://github.com/Agoric/agoric-sdk/commit/6ba74e98e6cea423098646426bb136780f6f8ff4))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))


### Features

* add collateralConfig to issuer entries and enact ([8ce966b](https://github.com/Agoric/agoric-sdk/commit/8ce966bdb4f74960189b73d0721e92ae3c5912f0))
* add more collateral types, pivot to BLD/RUN and decimals ([7cbce9f](https://github.com/Agoric/agoric-sdk/commit/7cbce9f53fc81d273d3ebd7c78d93caedbd23b2e))
* introduce @agoric/treasury and pass tests ([6257231](https://github.com/Agoric/agoric-sdk/commit/6257231e23cd501e6e20ef16e4f4d569ff30b265))
* use multipoolAutoswap as the treasury priceAuthority ([a37c795](https://github.com/Agoric/agoric-sdk/commit/a37c795a98f38ac99581d441e00177364f404bd3))
