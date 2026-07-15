# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.0-u23.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/ymax-planner@2.0.0-u23.0...@aglocal/ymax-planner@2.0.0-u23.1) (2026-07-15)

**Note:** Version bump only for package @aglocal/ymax-planner

## 2.0.0-u23.0 (2026-04-27)

### ⚠ BREAKING CHANGES

* **ymax-planner:** Fully replace use of the deprecated Spectrum REST API with GraphQL
* remove invokeEntry
* **ymax-planner:** Submit plans with policyVersion and rebalanceCount

### Features

* chained proxies for reflectWalletStore ([0155f9f](https://github.com/Agoric/agoric-sdk/commit/0155f9f7353438f63ebfc21e3244246895b42fdf))
* **client-utils:** Support FQDNs in AGORIC_NET for parseNetworkSpec and fetchNetworkConfig/fetchEnvNetworkConfig ([#11926](https://github.com/Agoric/agoric-sdk/issues/11926)) ([2b118b6](https://github.com/Agoric/agoric-sdk/commit/2b118b6dd5e77e54fc06480b86ce99cd593b6574))
* get mnemonic from GCP ([1c3a376](https://github.com/Agoric/agoric-sdk/commit/1c3a37621572da9ef7cd533587fcca91ee8eb5ee))
* **internal:** Add stripPrefix ([e60ae1e](https://github.com/Agoric/agoric-sdk/commit/e60ae1eaad85a7ddc8c2203376281bf9fe9149e4))
* portfolio.flow trace ([801d39b](https://github.com/Agoric/agoric-sdk/commit/801d39bf3916048da6888a2083b21b17f4fcd1af))
* **portfolio:** implement GMP support for createAndDeposit Factory ([d38388d](https://github.com/Agoric/agoric-sdk/commit/d38388d6f7a2449ff34733af97270ffe10f4d0b0))
* **ymax-planner:** Account for Axelar Cosmos-EVM fees ([ac2095c](https://github.com/Agoric/agoric-sdk/commit/ac2095c52623759da464bdc16370964399b8db1f))
* **ymax-planner:** Add --dry-run mode to log bridge actions without sending them ([0e456c1](https://github.com/Agoric/agoric-sdk/commit/0e456c15f94b7cce37ba4a56c34585aab8548178))
* **ymax-planner:** Add flow-based submission for deposit and withdraw ([63df3f9](https://github.com/Agoric/agoric-sdk/commit/63df3f9561de2a960e6bf848d275fe61a8bceb69))
* **ymax-planner:** Add heartbeat logic to CosmosRPCClient ([25d891f](https://github.com/Agoric/agoric-sdk/commit/25d891f95f6dfe80d231c51d2fbe263ab31698d8))
* **ymax-planner:** Add planRebalanceToAllocations ([aa42456](https://github.com/Agoric/agoric-sdk/commit/aa42456721d6064e022dacf0a8ab0095e565cf73))
* **ymax-planner:** Add planWithdrawFromAllocations ([469fe40](https://github.com/Agoric/agoric-sdk/commit/469fe4014a3108ba616d20bf41f70f6739d7d247))
* **ymax-planner:** Add readStorageMeta for reading data or children at a minimum block height ([8ac57e2](https://github.com/Agoric/agoric-sdk/commit/8ac57e23db99be6a7373f2de70132c798ab848a4))
* **ymax-planner:** Check deposit address balances for new portfolios ([d54ce95](https://github.com/Agoric/agoric-sdk/commit/d54ce954230ae9bf45fb6274f2c83619f8d27911))
* **ymax-planner:** Improve gasEstimator error output ([78a67b1](https://github.com/Agoric/agoric-sdk/commit/78a67b16d177c68a3b5cd06e321d61545dff4e3a))
* **ymax-planner:** Improve output for scanning/searching GCP Logs ([#12197](https://github.com/Agoric/agoric-sdk/issues/12197)) ([14b75b9](https://github.com/Agoric/agoric-sdk/commit/14b75b95620bd25b9a0f8f4ace551bb44b1f52de))
* **ymax-planner:** Look for deposits of a particular denom ([c195b8d](https://github.com/Agoric/agoric-sdk/commit/c195b8d3da550208d04cc5ef3f4f984c97429123))
* **ymax-planner:** Make GraphQL clients ([732f804](https://github.com/Agoric/agoric-sdk/commit/732f804b5e198c99d26822f509b8ea491faf67bb))
* **ymax-planner:** Provide flow steps with partial ordering information ([3a029de](https://github.com/Agoric/agoric-sdk/commit/3a029de1ef3ca6b394e461b8b5b76fe3d1199ae5))
* **ymax-planner:** Reject flows that have no steps or solution ([4561c4b](https://github.com/Agoric/agoric-sdk/commit/4561c4b0c3535a0ce551f063220208257b3c5203))
* **ymax-planner:** Require direct vstorage read block height to be at or after the triggering event ([e05d966](https://github.com/Agoric/agoric-sdk/commit/e05d9661d12815572c77e6f45b82cdc5b3081e9b))
* **ymax-planner:** Respond to portfolio-level vstorage events ([28b7342](https://github.com/Agoric/agoric-sdk/commit/28b7342c3a67a9dce4ca881d1d35ff563ba7e132))
* **ymax-planner:** Run flows in sequence ([496cf82](https://github.com/Agoric/agoric-sdk/commit/496cf826e13c9412f6be77c5f9cc7999bbbc12a6))
* **ymax-planner:** Separate "cluster" config from Agoric chain config ([5035278](https://github.com/Agoric/agoric-sdk/commit/50352789b8a124c5fe7e78141036fd37cd0af8e4))
* **ymax-planner:** Simplify validation of axelarApiAddress ([860662e](https://github.com/Agoric/agoric-sdk/commit/860662e8d86bf8e3422e2d61c298a26e5415af71))
* **ymax-planner:** Submit plans with policyVersion and rebalanceCount ([7bc9437](https://github.com/Agoric/agoric-sdk/commit/7bc943791e353a343a2940726ea405b6a8a09e16)), closes [#11805](https://github.com/Agoric/agoric-sdk/issues/11805) [#11917](https://github.com/Agoric/agoric-sdk/issues/11917)
* **ymax-planner:** Submit steps for a flow using a type-aware resolvePlan via wallet store reflection ([f6a2734](https://github.com/Agoric/agoric-sdk/commit/f6a273455260134f9953a509d05cf86d0db8b74d))
* **ymax-planner:** Support --dry-run with a previously-unused address ([e9b02d9](https://github.com/Agoric/agoric-sdk/commit/e9b02d9031dd5cbca03d0b9a019bbdec3f4466cc))
* **ymax-planner:** Support external EVM accounts for deposit and withdraw ([fa28966](https://github.com/Agoric/agoric-sdk/commit/fa28966e8c97876dccb5cf9ad6501ac6738153d3))
* **ymax-planner:** Update CosmosRPCClient to expose the websocket close event ([4b2bfa9](https://github.com/Agoric/agoric-sdk/commit/4b2bfa9ffc94f1963e287244984ebdfce7526570))
* **ymax-planner:** Use flow-aware resolvePlan for rebalance and withdraw ([55b8657](https://github.com/Agoric/agoric-sdk/commit/55b86570e7fa478374fa0d044c1db43e38f6d155)), closes [#11995](https://github.com/Agoric/agoric-sdk/issues/11995)

### Bug Fixes

* compensate fudge factor in time window end calculation ([ecbc477](https://github.com/Agoric/agoric-sdk/commit/ecbc47794d8c302a554498bcd205499879a93577))
* correct HandlePendingTxOpts type in process-tx ([25e6d9d](https://github.com/Agoric/agoric-sdk/commit/25e6d9dc0a1c41f43958a2c8d7b04af7254f8247))
* distinguish successful and reverted GMP transactions ([3dd08bf](https://github.com/Agoric/agoric-sdk/commit/3dd08bfc6a61b6a6b422fa26f36a0d8224211bfa))
* don't include dust accounts in graph solving ([c234900](https://github.com/Agoric/agoric-sdk/commit/c2349007574b792990ae7650291c7ee7af24e820))
* dont resolve if aborted ([944d41f](https://github.com/Agoric/agoric-sdk/commit/944d41f64bc921355b03ab25ff06dbb09d0b0c23))
* handle unhandled promise rejections from live watchers ([05d2edd](https://github.com/Agoric/agoric-sdk/commit/05d2edd9bc9a9e4ff46abe8f52ba4b1fcd2568da))
* https://github.com/Agoric/agoric-private/issues/416 ([87fed69](https://github.com/Agoric/agoric-sdk/commit/87fed69d4f634d33a7cf1e7664a021c2913c30c6))
* minor review fixes ([a25112a](https://github.com/Agoric/agoric-sdk/commit/a25112ac5b40f5ce3977cd697f04e0fd540c0ee4))
* normalize wallet address to lowercase before comparison ([746f5c7](https://github.com/Agoric/agoric-sdk/commit/746f5c7a4a3fb2559ce27510ba2424b4158b38dd))
* **portfolio-contract:** all edges must have a non-zero cost to prevent cycles. ([4623c21](https://github.com/Agoric/agoric-sdk/commit/4623c21a1ef20aad29c8a0133f8a26610f85c8d0))
* **portfolio-contract:** Remove direct CCTPv2 routes from the production network ([#12454](https://github.com/Agoric/agoric-sdk/issues/12454)) ([754698c](https://github.com/Agoric/agoric-sdk/commit/754698ceecae0bf068be0022082e672ff4bc71cb)), closes [#12427](https://github.com/Agoric/agoric-sdk/issues/12427)
* preserve block tracking when cctp transfer not found ([ec95db1](https://github.com/Agoric/agoric-sdk/commit/ec95db1b08afc24f29c8bb2dca92b77cfefe4ea7))
* prevent duplicate GMP transaction resolution in lookback mode ([182dd06](https://github.com/Agoric/agoric-sdk/commit/182dd065243035494e453ea7cc2ad03ceca58f70))
* replace Promise.withResolvers with Node 20-compatible pattern ([67a4fb6](https://github.com/Agoric/agoric-sdk/commit/67a4fb696540f80402da11d71fdaa3fd9bef5299))
* resolve account sequence errors with queue-based transaction management ([c848ae5](https://github.com/Agoric/agoric-sdk/commit/c848ae50c6810890555cac8bcd4f6f82370e1c42))
* **resolver:** tolerate unknown `TxTypes` ([08ef6ec](https://github.com/Agoric/agoric-sdk/commit/08ef6ec6e2e4121f651e68b19e8c63e58df189dd))
* retry getInvitationMakers call for transient rpc failures ([72e3db1](https://github.com/Agoric/agoric-sdk/commit/72e3db123d958e865ece6e478f21b3114f68c363))
* subscribe to NewBlock events instead of NewBlockHeader ([#11959](https://github.com/Agoric/agoric-sdk/issues/11959)) ([e3bf786](https://github.com/Agoric/agoric-sdk/commit/e3bf7868c6b78d4e850fb80ba64885e8d92fafc5))
* use SDK types for REST API account responses ([6c9bc88](https://github.com/Agoric/agoric-sdk/commit/6c9bc88a44292f4cc7bd003f8722f0596960973f))
* use toQuantity for JSON-RPC hex params and add rate-limit retry to scanners ([03d1ad2](https://github.com/Agoric/agoric-sdk/commit/03d1ad22d9fd0d9c1cfa8434418570aa9d1b82f7))
* wait for future blocks in lookback mode EVM log scanning ([2172750](https://github.com/Agoric/agoric-sdk/commit/217275087d21a2bd7326e95588ed6fd82dfa6b06))
* **ymax-planner:** add missing kvStore and txId to SmartWallet watchers ([c522d4b](https://github.com/Agoric/agoric-sdk/commit/c522d4b86598abcfc2195d23ece1156fd7b20759))
* **ymax-planner:** adjust the default fee to 0.015 BLD for planner and resolver txns ([#12209](https://github.com/Agoric/agoric-sdk/issues/12209)) ([89cb9d4](https://github.com/Agoric/agoric-sdk/commit/89cb9d4295fa7cda5f94ec4d5220baffcc9776dd))
* **ymax-planner:** Allow target weight of zero ([75fec70](https://github.com/Agoric/agoric-sdk/commit/75fec70a2ce32601081fa2bf75efda60f366e343))
* **ymax-planner:** Call CosmosRPCClient error logic directly upon heartbeat timeout ([5b08d16](https://github.com/Agoric/agoric-sdk/commit/5b08d16480a3ff8361ff6785d8766de29ee3e537)), closes [#12128](https://github.com/Agoric/agoric-sdk/issues/12128)
* **ymax-planner:** Consider old allocations in computeWeightedTargets ([f052c45](https://github.com/Agoric/agoric-sdk/commit/f052c45ad76bf1f451cd487f8f86147acfda9c0a))
* **ymax-planner:** Document optionality of agoricNetSubdomain config ([#11937](https://github.com/Agoric/agoric-sdk/issues/11937)) ([a68aa99](https://github.com/Agoric/agoric-sdk/commit/a68aa996030643c62d38fec8b8469bfe8f021ecb)), closes [#11888](https://github.com/Agoric/agoric-sdk/issues/11888) [#11926](https://github.com/Agoric/agoric-sdk/issues/11926)
* **ymax-planner:** Don't resubmit steps to the same effective portfolio state ([5889ece](https://github.com/Agoric/agoric-sdk/commit/5889ece4f6bebdeb2de4eb29a58660f7635cbc36))
* **ymax-planner:** Ensure that nonrecoverable failures are detected ([d67308f](https://github.com/Agoric/agoric-sdk/commit/d67308f5f78888ac3195f39211cb95e0c8c7b22e))
* **ymax-planner:** Environment variable YDS_URL should be optional ([b6d82c8](https://github.com/Agoric/agoric-sdk/commit/b6d82c8454cae47c7a9d1d3562370738b8e627d3)), closes [#12310](https://github.com/Agoric/agoric-sdk/issues/12310)
* **ymax-planner:** Exclude GraphQL operation description strings in outbound messages ([1ff105b](https://github.com/Agoric/agoric-sdk/commit/1ff105be2d471eeafa3b0834056a2a47d49a7cdf)), closes [#12332](https://github.com/Agoric/agoric-sdk/issues/12332)
* **ymax-planner:** Exit handlePortfolio for unchanged effective state ([#12210](https://github.com/Agoric/agoric-sdk/issues/12210)) ([eb2c18a](https://github.com/Agoric/agoric-sdk/commit/eb2c18a28cd8fc2a0d69cd21710eedf24550facb)), closes [#12201](https://github.com/Agoric/agoric-sdk/issues/12201)
* **ymax-planner:** Exit handlePortfolio for unchanged effective state ([#12210](https://github.com/Agoric/agoric-sdk/issues/12210)) ([9f928d1](https://github.com/Agoric/agoric-sdk/commit/9f928d16eb2f1ccb720bfe17a3105cbae5b0f511)), closes [#12201](https://github.com/Agoric/agoric-sdk/issues/12201)
* **ymax-planner:** Expect policyVersion and rebalanceCount ([4feda74](https://github.com/Agoric/agoric-sdk/commit/4feda74c0d8b8561ca31da0bd0f65e8ae3ddc3a1))
* **ymax-planner:** Finalize CosmosRPCClient subscriptions upon websocket close/error ([e7b00e7](https://github.com/Agoric/agoric-sdk/commit/e7b00e75d55d063a8caf3812d10d2d57d5077f3a))
* **ymax-planner:** get USDN balance using uusdn denom ([f585e24](https://github.com/Agoric/agoric-sdk/commit/f585e2405c124eefd05b451fb837fbd1a878cb2b))
* **ymax-planner:** Ignore policy rebalanceCount increments ([9ae2e5e](https://github.com/Agoric/agoric-sdk/commit/9ae2e5edc83389855424f0dea792b91b5a04df0d)), closes [#11805](https://github.com/Agoric/agoric-sdk/issues/11805) [#11973](https://github.com/Agoric/agoric-sdk/issues/11973)
* **ymax-planner:** Increase the resolver tx fee submission to 0.05 BLD ([d75220c](https://github.com/Agoric/agoric-sdk/commit/d75220cd3c6351165294dcae320e72231d25c114))
* **ymax-planner:** Increase the resolver tx fee submission to 0.25 BLD ([dbbf7ef](https://github.com/Agoric/agoric-sdk/commit/dbbf7ef80a166543c3d4df856d973c4195c67370)), closes [#12254](https://github.com/Agoric/agoric-sdk/issues/12254)
* **ymax-planner:** Log warnings/errors rather than crashing ([592dbaa](https://github.com/Agoric/agoric-sdk/commit/592dbaa2081c3b35fd19aebabf48fd52ee4a51ed))
* **ymax-planner:** Prefer to query balances using Spectrum GraphQL ([4304936](https://github.com/Agoric/agoric-sdk/commit/430493608093247ad44a3ad88f4913a619dbebef))
* **ymax-planner:** process pending tx events concurrently with portfolio events ([2885603](https://github.com/Agoric/agoric-sdk/commit/28856036467a2d590b784ad5560053576a1c8667))
* **ymax-planner:** Process portfolio events in deterministic nat-based order ([9932036](https://github.com/Agoric/agoric-sdk/commit/99320363481c7fed63b12be16903f117f10b38d0))
* **ymax-planner:** Restore the 0.5 BLD fee amount ([470c602](https://github.com/Agoric/agoric-sdk/commit/470c60259ab2749f6b65a373e74e4db0aa427801)), closes [#12209](https://github.com/Agoric/agoric-sdk/issues/12209)
* **ymax-planner:** Run with 6-second heartbeats ([6ce7f75](https://github.com/Agoric/agoric-sdk/commit/6ce7f755f7077277d3cdc85baaaae845871c9065)), closes [#12126](https://github.com/Agoric/agoric-sdk/issues/12126)
* **ymax-planner:** Scale [u]USDC@agoric balances from Spectrum GraphQL responses ([5fda564](https://github.com/Agoric/agoric-sdk/commit/5fda564b5ba734fc20ed5b433484f86ddef5af4e))
* **ymax-planner:** Treat dust deltas as zeros ([4011373](https://github.com/Agoric/agoric-sdk/commit/40113739b9a3001bf262511852295f7ecd589f88))
* **ymax-planner:** Treat only direct children of published.ymax0.portfolios as portfolio paths ([#11939](https://github.com/Agoric/agoric-sdk/issues/11939)) ([62da90a](https://github.com/Agoric/agoric-sdk/commit/62da90a1d2fdb5120f56fdae0be89504ecb4dd0d)), closes [#11929](https://github.com/Agoric/agoric-sdk/issues/11929)
* **ymax-resolver:** add retry logic when reading initial pending transactions ([ba7aeb9](https://github.com/Agoric/agoric-sdk/commit/ba7aeb9087f11f8e4ade986b19c12ad53a04ba3d))
* **ymax-resolver:** add watcher diagnostics and prevent duplicate subscriptions ([#12534](https://github.com/Agoric/agoric-sdk/issues/12534)) ([856918d](https://github.com/Agoric/agoric-sdk/commit/856918df09e60a540a7ca21f424f856c5b612878))
* **ymax-resolver:** parse both Factory and DepositFactory execute payloads ([a2dd608](https://github.com/Agoric/agoric-sdk/commit/a2dd608808889f77e4977b618e38d0f655130004))
* **ymax-resolver:** subscribe to tx destination for wallet creation ([54189f1](https://github.com/Agoric/agoric-sdk/commit/54189f1600f1af945214cf68e8d81b0fe03aaca4))

### Miscellaneous Chores

* remove invokeEntry ([da011f3](https://github.com/Agoric/agoric-sdk/commit/da011f30f39ea0a74181ac4a01728674b5b53cb6))
* **ymax-planner:** Fully replace use of the deprecated Spectrum REST API with GraphQL ([8267a9a](https://github.com/Agoric/agoric-sdk/commit/8267a9ab0b7c8353dca400fae592c785c16ce3b4))

## [1.0.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/ymax-planner@1.0.1-u22.1...@aglocal/ymax-planner@1.0.1) (2026-04-02)

**Note:** Version bump only for package @aglocal/ymax-planner

## [1.0.1-u22.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/ymax-planner@1.0.1-u22.0...@aglocal/ymax-planner@1.0.1-u22.1) (2025-09-09)

**Note:** Version bump only for package @aglocal/ymax-planner

## 1.0.1-u22.0 (2025-09-09)

**Note:** Version bump only for package @aglocal/ymax-planner
