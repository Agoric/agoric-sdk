# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.0-u23.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-contract@0.3.0-u23.0...@aglocal/portfolio-contract@0.3.0-u23.1) (2026-07-15)

**Note:** Version bump only for package @aglocal/portfolio-contract

## 0.3.0-u23.0 (2026-04-27)

### ⚠ BREAKING CHANGES

* **portfolio-contract:** Simplify RebalanceGraph and rename to FlowGraph
* add flowsRunning to PortfolioKitState

 - contract.test (i.e. user stories)
   - withdraw using planner
   - Beefy Withdraw: note it's a postponed mechanism
 - typeguards:
   - ProposalType['withdraw'] with shape
   - refine ProposalType['openPortfolio'] to allow Empty want
   - add flowsRunning: Record<number, FlowDetail> to StatusFor['portfolio']
     - deprecate flowCount
 - contract: orchestrate withdraw flow; supply to portfolio exo
 - portfolio exo:
   - add Withdraw invitationMakers, withdrawHandler
   - track flowsRunning in state, vstorage
     - allocateFlowId -> startFlow / finishFlow
   - new .planner facet
 - planner exo: resolvePlan(...)
   - rebalanceCount arg is optional; default = 0
   - test: reflect wallet store so new methods pass thru
 - flows:
   - withdraw awaits steps from planner
   - rebalance: startFlow / finishFlow
 - test:
   - support want in seat mock
   - refactor: makeStorageTools for getPortfolioStatus
* **portfolio-contract:** planner .sumit() requires policyVersion arg
* publish all steps at start of flow
* **portfolio-contract:** StatusFor['flow'] src/desc changes from
resolved place label (e.g. AccountId) to AssetPlaceRef (e.g. @noble).
* **portfolio-contract:** offer client does not pay GmpFee
* updates arguments of buildGMPPayload function

### Features

* add accountStateByChain to vstorage ([cf98d80](https://github.com/Agoric/agoric-sdk/commit/cf98d80e62d2e8caf24c27ee012a8e5602c78e0a))
* add claim rewards functions for aave and compound ([25eb411](https://github.com/Agoric/agoric-sdk/commit/25eb4113a20fc6d1a9ae777c290ded8f4d0d14cf))
* add environment-based axelar chain configuration ([39ad0af](https://github.com/Agoric/agoric-sdk/commit/39ad0afb9b0551df57b5ad67c5aef3270239fdb7))
* add protocol for beefy ([e90b59d](https://github.com/Agoric/agoric-sdk/commit/e90b59d9c0b911d71c38054468d063d14396c727))
* add protocols ([19dd899](https://github.com/Agoric/agoric-sdk/commit/19dd899b290d1531deec06d584c865657454194d))
* adding a cctp status to vstorage so it is readable by ymax planner ([8226385](https://github.com/Agoric/agoric-sdk/commit/8226385187c6c146b13fdf0c7e7cf3b5b4f12ff0))
* allow remote account as verifying contract ([2e27957](https://github.com/Agoric/agoric-sdk/commit/2e2795748586a2814b21c1de91fc92c903bffc48))
* bump poc token from 24/25 to 26 ([0bb4608](https://github.com/Agoric/agoric-sdk/commit/0bb46081e143a63718c4e781a3844af85a5f033b))
* CCTP tx confirmation handler ([568e80b](https://github.com/Agoric/agoric-sdk/commit/568e80bb627cafebedc0c70d42d01374a803ada4))
* coordinate withdraw between client and planner ([792bf6e](https://github.com/Agoric/agoric-sdk/commit/792bf6e7bed149b0a035a113a4353e90298438c2))
* deploy funds to aave and compound ([526b4ab](https://github.com/Agoric/agoric-sdk/commit/526b4abfaadeb719155726f3c089b0429a84c852))
* deposit factory invokes factory for wallet creation ([57c9fe1](https://github.com/Agoric/agoric-sdk/commit/57c9fe1bcf157ce2cf3f2747c5d46ad4b7a2076b))
* EVM Wallet handleMessage ([aecbcfe](https://github.com/Agoric/agoric-sdk/commit/aecbcfea6faa81a32114d9805629066e044902f1))
* for Noble Dollar, client can give USDN out with USDC in ([4546225](https://github.com/Agoric/agoric-sdk/commit/454622526d38a3015e9a70023e750956b0a296d1))
* gmp calls for aave ([bbeb5c2](https://github.com/Agoric/agoric-sdk/commit/bbeb5c2f601bcbafe6fb60fe5f3bea56869735db))
* handle GMP and CCTP transactions off-chain ([#11752](https://github.com/Agoric/agoric-sdk/issues/11752)) ([7cb1020](https://github.com/Agoric/agoric-sdk/commit/7cb1020532ba8a386b4e1c37c0cd4f62a1d13f7e)), closes [#11709](https://github.com/Agoric/agoric-sdk/issues/11709)
* implement rebalance in evm facet ([5e828ed](https://github.com/Agoric/agoric-sdk/commit/5e828ed1db8587d036610750c8b70c1585ab4f46))
* initial router based gmp flows ([9dac2e5](https://github.com/Agoric/agoric-sdk/commit/9dac2e52ffc223919e027d7443d17c6bef20b94f))
* invitation maker names in portfolio-api ([b2d9f0d](https://github.com/Agoric/agoric-sdk/commit/b2d9f0d79e1c1e3e29392e3ef9e19b6f57057e6e))
* limit steps to 12 ([a7dad02](https://github.com/Agoric/agoric-sdk/commit/a7dad02f7b1d356d9941f9f6ec9805aba855b03b))
* open portfolio handler returns immediately ([1311b0b](https://github.com/Agoric/agoric-sdk/commit/1311b0b874d7f2d5dc6ec3da5bfe941507a47b50))
* openPortfolioFromEVM ([b771e8d](https://github.com/Agoric/agoric-sdk/commit/b771e8dbadbc1bb4f70c3ac62c3cf7d3dc79beb9))
* optional startedFlow in executePlan ([692be38](https://github.com/Agoric/agoric-sdk/commit/692be38a2d22045f26e248d190218558cddb09a4))
* optional startedFlow in rebalance() ([06a0c9b](https://github.com/Agoric/agoric-sdk/commit/06a0c9bbadb3f5aeb7aacca4d19fb22547c05991))
* pass axelar gmp addresses via privateArgs ([9065bdc](https://github.com/Agoric/agoric-sdk/commit/9065bdc4a400be6722404e01cf3ff88eb3475608))
* pass txId to sendGmpContractCall ([d8ad0b2](https://github.com/Agoric/agoric-sdk/commit/d8ad0b230c896fa0836d9d75bb74109169d39f26))
* portfolio handlers return immediately ([2ed46d4](https://github.com/Agoric/agoric-sdk/commit/2ed46d49d00102e7161448ae4552987f43514b1b))
* **portfolio-api:** Extend types and shapes for EVM deposits and withdrawals ([#12307](https://github.com/Agoric/agoric-sdk/issues/12307)) ([9b77fff](https://github.com/Agoric/agoric-sdk/commit/9b77fff24571dde366d6f2b83db5e80444f2e202))
* **portfolio-api:** FundsFlowPlan, StatusFor['flowOrder'] ([458eb2e](https://github.com/Agoric/agoric-sdk/commit/458eb2e52cee649657961fc480aa9444db58e718))
* **portfolio-api:** Withdraw EIP-712 message ([0205ba7](https://github.com/Agoric/agoric-sdk/commit/0205ba7899494db91ccae8c70c29e284ff494fa7))
* **portfolio-contract:** `makeProvideEVMAccount(...).done` promise ([01115a9](https://github.com/Agoric/agoric-sdk/commit/01115a9b7ec5e9914672b956fb62713cc88294b1))
* **portfolio-contract:** Accept client-supplied `rebalance` flow steps ([7596de4](https://github.com/Agoric/agoric-sdk/commit/7596de4515211a0f2c0c40aac13314b247bf4c8f))
* **portfolio-contract:** add abi-typed gmp call batch ([a6db99b](https://github.com/Agoric/agoric-sdk/commit/a6db99b011adbf1018a59452df73f774742041e0))
* **portfolio-contract:** Add portfolioIdFromKey and flowIdFromKey ([3c13d2e](https://github.com/Agoric/agoric-sdk/commit/3c13d2e16e9d4ee89e79a8d951f505b7fba0b822))
* **portfolio-contract:** add withdraw operation support in EVM handler ([5d39b51](https://github.com/Agoric/agoric-sdk/commit/5d39b5135297f7713cf3e82515a258c6278211f1))
* **portfolio-contract:** Allow multiple edges between the same nodes ([763eb26](https://github.com/Agoric/agoric-sdk/commit/763eb26c4e4e14804e68ef8a41908374b716cc2e))
* **portfolio-contract:** better output using tracer.sub(prefix) ([8b45b61](https://github.com/Agoric/agoric-sdk/commit/8b45b615c1d58fe12466b36f44e66aeba778b607))
* **portfolio-contract:** contractAccount for paying BLD fees ([53da91a](https://github.com/Agoric/agoric-sdk/commit/53da91a3e1e6cbfb011118d7787099f35830795d))
* **portfolio-contract:** creatorFacet.withdrawFees ([530289b](https://github.com/Agoric/agoric-sdk/commit/530289b1b3d8d9f6ef412e8157b5b4b60de7c15f))
* **portfolio-contract:** enhance EVM deposit flow with permit2 support and wallet address prediction ([c0f9c28](https://github.com/Agoric/agoric-sdk/commit/c0f9c28c9f237423b8c5eb51f716325c4c11a52a))
* **portfolio-contract:** gate access with a PoC token ([ad72c75](https://github.com/Agoric/agoric-sdk/commit/ad72c753cb493929ca85c668409f575ec65a53c2))
* **portfolio-contract:** handle EVM deposit to existing portfolio ([3c01658](https://github.com/Agoric/agoric-sdk/commit/3c01658164c00c168d81bb813444ba8bf9089dab))
* **portfolio-contract:** include FlowDetail in StatusFor['flow'] ([53390b2](https://github.com/Agoric/agoric-sdk/commit/53390b2c5d961c614b140b960b82dafbed9ed3dd))
* **portfolio-contract:** Include LP-solver failure results in error messages ([b343afb](https://github.com/Agoric/agoric-sdk/commit/b343afb7b737513cbc7f790e57425169c3ffb60e))
* **portfolio-contract:** initial withdraw implementation ([e0a3b14](https://github.com/Agoric/agoric-sdk/commit/e0a3b14cafcccf1de14280596da924b64cba26bb))
* **portfolio-contract:** let planner include partial order info ([75c557e](https://github.com/Agoric/agoric-sdk/commit/75c557e49349078bb59ac061f1e3ff9033d83e74))
* **portfolio-contract:** offer specifies steps; BLD for GMP fees ([1535efa](https://github.com/Agoric/agoric-sdk/commit/1535efaa97abca5bc8f28b506913fdf25ba48330))
* **portfolio-contract:** open portfolio w/USDN position ([2fa1c42](https://github.com/Agoric/agoric-sdk/commit/2fa1c425fc472b5d2f682392eccc4263a5113710))
* **portfolio-contract:** pass evmGas from offerArgs detail ([319900e](https://github.com/Agoric/agoric-sdk/commit/319900efc0c1222b76f90a6b7725775f22e5547e))
* **portfolio-contract:** pay BLD fees from contractAccount ([a4ea1e7](https://github.com/Agoric/agoric-sdk/commit/a4ea1e77b41fedf1072aace8f7d6d633c00ce59d))
* **portfolio-contract:** planner can reject promise/vow for plan ([ea590f1](https://github.com/Agoric/agoric-sdk/commit/ea590f1cdce708448ed7bcc7640302e1cfaed666))
* **portfolio-contract:** policyVersion ([8436499](https://github.com/Agoric/agoric-sdk/commit/8436499fa5a7d18687b18020bbc31a8e6c8b6789))
* **portfolio-contract:** pre-compute EVM addrs ([ee9932f](https://github.com/Agoric/agoric-sdk/commit/ee9932fa71447aabc06c3469175a5411fdc5ce51))
* **portfolio-contract:** publish flow order ([df1d8b1](https://github.com/Agoric/agoric-sdk/commit/df1d8b1e149c87365fd57878b84016ce3cb9e979))
* **portfolio-contract:** publish NFA ([0b35737](https://github.com/Agoric/agoric-sdk/commit/0b35737b0dab7066563726a1a4a959e59665c079))
* **portfolio-contract:** publish portfolios, positions, flows ([9f32a25](https://github.com/Agoric/agoric-sdk/commit/9f32a25dd6ea6bc7dd8fe57f6965ee81aef9d5c3))
* **portfolio-contract:** rebalance: open USDN or Aave position ([3e58d66](https://github.com/Agoric/agoric-sdk/commit/3e58d66f35cde5e0b6184ab9b32c1a815cac48d1))
* **portfolio-contract:** rebalanceCount ([00175f7](https://github.com/Agoric/agoric-sdk/commit/00175f727c7f169a0710be1a90ead2b4c0c432e9))
* **portfolio-contract:** run steps concurrently with partial order ([8089850](https://github.com/Agoric/agoric-sdk/commit/8089850236d4e07a1d33a7daa6037ee3cb773c4d))
* **portfolio-contract:** set target allocation ([d218c07](https://github.com/Agoric/agoric-sdk/commit/d218c0752993cf5f6c7d88bbb7ce0c26dd46c29a))
* **portfolio-contract:** single-flow deposit, rebalance, withdraw ([84f1565](https://github.com/Agoric/agoric-sdk/commit/84f1565fbce994b2cf97cbfd4f8ce643acb5f222))
* **portfolio-contract:** typed patterns for vstorage ([48dbf68](https://github.com/Agoric/agoric-sdk/commit/48dbf683dd94698aad384bccb28f2b3e1c5a7c74))
* **portfolio-contract:** use CCTP TokenMessenger to go EVM->Noble ([89ab245](https://github.com/Agoric/agoric-sdk/commit/89ab245b6d67cdf06e238631c2bba5a6ea2a5b34))
* **portfolio-contract:** verify that signer is withdraw account ([0c00ea2](https://github.com/Agoric/agoric-sdk/commit/0c00ea21eadb29df08f2017f52c4b08a31dc8bf6))
* **portfolio:** add evm message handler ([d98663a](https://github.com/Agoric/agoric-sdk/commit/d98663a3f3098d2f2ace1006847005796c6cb54b))
* **portfolio:** bind standalone evm messages to deposit factory contract ([409854d](https://github.com/Agoric/agoric-sdk/commit/409854dba05d2d4128a5ade03854f3cfad596237))
* **portfolio:** implement GMP support for createAndDeposit Factory ([d38388d](https://github.com/Agoric/agoric-sdk/commit/d38388d6f7a2449ff34733af97270ffe10f4d0b0))
* publish accountsPending ([48701c3](https://github.com/Agoric/agoric-sdk/commit/48701c3784a312efa9a52e591dd11d16f4fd5b47))
* publish all steps at start of flow ([fc08736](https://github.com/Agoric/agoric-sdk/commit/fc0873625adad1e02b08e5a969d6676cefe63a92))
* publish axelar chains data on agoricNames ([75f28bc](https://github.com/Agoric/agoric-sdk/commit/75f28bc8df97687761e1fc456bf94bc13b82d024))
* publish deadline in EIPMessageUpdate ([8d0b6e9](https://github.com/Agoric/agoric-sdk/commit/8d0b6e911fd2cd570f1f70908fcb8e1eeee660d5))
* publish result of EVM Message ([353e505](https://github.com/Agoric/agoric-sdk/commit/353e50563cd8000519fcaece43f1a57ef3372e2b))
* PublishedTx in TypedPublished ([b49622d](https://github.com/Agoric/agoric-sdk/commit/b49622d29f46fd4ecb3811bf1428a244caa3b43c))
* rebalance handler return immediately ([5e7fd40](https://github.com/Agoric/agoric-sdk/commit/5e7fd4030e12b175cbc2c548a59b4973c224cce9))
* require chainId and verifying contract in eip712 domain ([2f5b8c6](https://github.com/Agoric/agoric-sdk/commit/2f5b8c638e9cd55a251fb63c634f2d3dd10914ae))
* send tokens to EVM chain via CCTP ([2e08984](https://github.com/Agoric/agoric-sdk/commit/2e08984acd045825725c60f88d608f0c47c0f0d3))
* support both router and deposit factory ([88b2349](https://github.com/Agoric/agoric-sdk/commit/88b2349f91072e0841c479780cb72318c44c3d47))
* take CCTPv2 fee / speed info from plan detail ([85b9fe2](https://github.com/Agoric/agoric-sdk/commit/85b9fe277a85728bf3c06fc368ae82a0216ad8a2))
* upgrade Interchain Stack dependencies to Cosmos v0.53 redux ([511d4f7](https://github.com/Agoric/agoric-sdk/commit/511d4f74bae7144be5bc904dd7a50f01d09648ed))
* validate deposit offerArgs ([6418f51](https://github.com/Agoric/agoric-sdk/commit/6418f5130a986d31fb2d94504fd478dab5685763))
* vetted routed-based accounts record their factory ([79b336d](https://github.com/Agoric/agoric-sdk/commit/79b336d97e269e81b2eb1416ebff6e3354edaccb))
* wire rebalance and simpleRebalance in EVM Wallet handler ([b980fa1](https://github.com/Agoric/agoric-sdk/commit/b980fa1e9f8917eccdb80770aed912f5cf89c1cb))
* withdraw from USDN ([411bde1](https://github.com/Agoric/agoric-sdk/commit/411bde16ea9f7a07aad117b14de78e701c114075))
* wrap remoteMarshaller into cachingMarshaller ([1aa2806](https://github.com/Agoric/agoric-sdk/commit/1aa2806011ec8557512fa12c9f321416ff334dde))
* ymax contract restartable ([0d237a3](https://github.com/Agoric/agoric-sdk/commit/0d237a39cfd8c42978126feb5871f973f3eea53f))
* ymax planner ([43ae048](https://github.com/Agoric/agoric-sdk/commit/43ae04896dc7b08baa0daacd56cb84741ef114d1))
* **ymax-planner:** Account for Axelar Cosmos-EVM fees ([ac2095c](https://github.com/Agoric/agoric-sdk/commit/ac2095c52623759da464bdc16370964399b8db1f))
* **ymax-planner:** Provide flow steps with partial ordering information ([3a029de](https://github.com/Agoric/agoric-sdk/commit/3a029de1ef3ca6b394e461b8b5b76fe3d1199ae5))
* **ymax-planner:** Reject flows that have no steps or solution ([4561c4b](https://github.com/Agoric/agoric-sdk/commit/4561c4b0c3535a0ce551f063220208257b3c5203))

### Bug Fixes

* add additional networks and pools to the routing graph ([7251cc7](https://github.com/Agoric/agoric-sdk/commit/7251cc76f5274e26063edc49f4dd888bb2502f7a))
* add Beefy pools (and test for them). ([a4b338f](https://github.com/Agoric/agoric-sdk/commit/a4b338ffb8dfc63e4c0e3c9b4c58f7f18811b47f))
* align vstorage posted data with expected resolver handler status ([#11815](https://github.com/Agoric/agoric-sdk/issues/11815)) ([fea7786](https://github.com/Agoric/agoric-sdk/commit/fea77864ae4355e4d7aa750e3008ad4899949c14)), closes [#11752](https://github.com/Agoric/agoric-sdk/issues/11752)
* allow sourceAddress in PublishedTxShapes CCTP_TO_EVM ([db0f6cf](https://github.com/Agoric/agoric-sdk/commit/db0f6cfe58ba636ea0c3ad645c2b9a658c7f3ae5))
* correct contract addresses from gmp calls ([e30c43e](https://github.com/Agoric/agoric-sdk/commit/e30c43e5fe48258e9e268f65ca675b37663c5966))
* decoding address from ethereum ([1ed9435](https://github.com/Agoric/agoric-sdk/commit/1ed9435a9d4eb6c74bc0e760346a19077d71e49e))
* depositFromEVM fails locally if spender mismatch remote account ([2eb5d12](https://github.com/Agoric/agoric-sdk/commit/2eb5d12a90ce8aff780c2cead07b655c08d41999))
* disallow depositFactory spender if remote account address mismatch ([3f4144b](https://github.com/Agoric/agoric-sdk/commit/3f4144b53038dd924b36bce9dd27e0cdbdc785ce))
* don't include dust accounts in graph solving ([c234900](https://github.com/Agoric/agoric-sdk/commit/c2349007574b792990ae7650291c7ee7af24e820))
* ensure unique contract addresses per chain ([69e3649](https://github.com/Agoric/agoric-sdk/commit/69e36494e62bf5774b73f04e91d7519a43bec78b))
* executePlan should always exit seat ([1b470fc](https://github.com/Agoric/agoric-sdk/commit/1b470fca9593c2c26d32a62fe1cae1f494e9ec0b))
* handle failure in provideCosmosAccount / provideEVMAccount ([cae4ac1](https://github.com/Agoric/agoric-sdk/commit/cae4ac1923cbba3e2a6da5248634877a49b99607))
* https://github.com/Agoric/agoric-private/issues/416 ([87fed69](https://github.com/Agoric/agoric-sdk/commit/87fed69d4f634d33a7cf1e7664a021c2913c30c6))
* lint ([610550c](https://github.com/Agoric/agoric-sdk/commit/610550cd4ef7bd0e4c94806355a5e83b49da5ebd))
* make account recovery blocks following steps ([cd4233e](https://github.com/Agoric/agoric-sdk/commit/cd4233e6be86a2df5679778a1f9a9269662821fe))
* make ethereum value capitalized ([17526bc](https://github.com/Agoric/agoric-sdk/commit/17526bcdea2c940f7bdbe294d7de0b511a749610))
* make srcAddr optional and use right lca address ([#12389](https://github.com/Agoric/agoric-sdk/issues/12389)) ([86de279](https://github.com/Agoric/agoric-sdk/commit/86de2791d2127c00259d7dc5066a4e2c9410a203))
* minor review fixes ([a25112a](https://github.com/Agoric/agoric-sdk/commit/a25112ac5b40f5ce3977cd697f04e0fd540c0ee4))
* obsolete netTransfers - positive assumption is faulty ([8172694](https://github.com/Agoric/agoric-sdk/commit/8172694d9234c4e00fef6d328eb1eca5ba1fdc80))
* PoolKeyShape extensibility ([bd7fa4b](https://github.com/Agoric/agoric-sdk/commit/bd7fa4bf4b23e5825de179200e30974e061237df))
* **portfolio-api:** Allow extensions to MovementDescShape ([b9824d9](https://github.com/Agoric/agoric-sdk/commit/b9824d9d3318a96018ef0c676b515c0e511f9905))
* **portfolio-contract:** `phases` vstorage lists all serial txes ([0f7aac2](https://github.com/Agoric/agoric-sdk/commit/0f7aac2c8eb5106f7129af08ccccc1447154dfe3))
* **portfolio-contract:** add `progressTracker` to `createAndDeposit` ([e4ff578](https://github.com/Agoric/agoric-sdk/commit/e4ff57843fc2cea91cf24a95b734b6c525b5da8d))
* **portfolio-contract:** all edges must have a non-zero cost to prevent cycles. ([4623c21](https://github.com/Agoric/agoric-sdk/commit/4623c21a1ef20aad29c8a0133f8a26610f85c8d0))
* **portfolio-contract:** allow EVM `depositFactory` to be Permit2 spender ([1c7dd17](https://github.com/Agoric/agoric-sdk/commit/1c7dd1723cc8d04942abd62781fcbc202c8001e3))
* **portfolio-contract:** avoid undefined USDN lock amount ([842feea](https://github.com/Agoric/agoric-sdk/commit/842feea4f13b1ea31de651f9c932bb23964aaecd))
* **portfolio-contract:** bulletproof Axelar sender detection ([a8f0075](https://github.com/Agoric/agoric-sdk/commit/a8f0075942e0f9a6303841eda53caad98a44389d))
* **portfolio-contract:** consume Access token ([cc302cf](https://github.com/Agoric/agoric-sdk/commit/cc302cf4c8666a0206c7f84e5ea9bf1f12be2189))
* **portfolio-contract:** don't make new storage nodes on each update ([b10a8c1](https://github.com/Agoric/agoric-sdk/commit/b10a8c15a168dc7b527f83015c2b44d14204052b))
* **portfolio-contract:** enforce deposit of usdc on evm open ([505cb1c](https://github.com/Agoric/agoric-sdk/commit/505cb1c198c635a605d003187472b236bd64b20f))
* **portfolio-contract:** enforce evm withdraw of usdc token ([1158e9a](https://github.com/Agoric/agoric-sdk/commit/1158e9a057cd05f20bab8adf9ee9eda3c69855c2))
* **portfolio-contract:** ensure evm message deadline hasn't passed ([2ec8864](https://github.com/Agoric/agoric-sdk/commit/2ec8864757a5d5d62b7da51ac3d109c0949abbe1))
* **portfolio-contract:** evmHandler.rebalance calls executePlan ([d74e448](https://github.com/Agoric/agoric-sdk/commit/d74e448390e8bb896d84b38e2762fd12b84d8bca))
* **portfolio-contract:** evmHandler.withdraw calls executePlan ([be930ee](https://github.com/Agoric/agoric-sdk/commit/be930ee6d9e088972fe721bddb2d234f69a9c30d))
* **portfolio-contract:** in CCTPfromEVM, await makeAccount ([6b1bafc](https://github.com/Agoric/agoric-sdk/commit/6b1bafccc1c5ab9ccd8a2736b532d754ee1eb156))
* **portfolio-contract:** initial plan validation: not empty ([6048aa1](https://github.com/Agoric/agoric-sdk/commit/6048aa1279692da61d46dc65fa73e75e617207b1))
* **portfolio-contract:** limit outbound CCTP to >= 1USDC ([cc94f73](https://github.com/Agoric/agoric-sdk/commit/cc94f731cfa38546fef2602cd08cca16acb23784))
* **portfolio-contract:** make createAndDeposit always deposit ([51d01f6](https://github.com/Agoric/agoric-sdk/commit/51d01f69472daba8aab6c2b64f7328806768cc97))
* **portfolio-contract:** Make links for deposit/withdraw nodes unidirectional ([7b45824](https://github.com/Agoric/agoric-sdk/commit/7b45824d916bf2d7b9d54084d7deac04befa0b18)), closes [#12308](https://github.com/Agoric/agoric-sdk/issues/12308)
* **portfolio-contract:** Make validateSolvedFlows more strict ([52db8da](https://github.com/Agoric/agoric-sdk/commit/52db8da69c86d2cb274d78e9d2ac4b09a357064c)), closes [#12123](https://github.com/Agoric/agoric-sdk/issues/12123)
* **portfolio-contract:** move CCTPtoUser async tick after tx registration ([#12465](https://github.com/Agoric/agoric-sdk/issues/12465)) ([f561d5d](https://github.com/Agoric/agoric-sdk/commit/f561d5df4477ef584645c64f2c504f2df10e3a82))
* **portfolio-contract:** no more async move builders ([85daa12](https://github.com/Agoric/agoric-sdk/commit/85daa12f07e6a862be332a807c30c660a5b82b21))
* **portfolio-contract:** offer client does not pay GmpFee ([2a37878](https://github.com/Agoric/agoric-sdk/commit/2a378788266474dccbc6bac42a14c8a7c697bec7))
* **portfolio-contract:** Prevent preflightValidateNetworkPlan from masking underlying errors ([#12233](https://github.com/Agoric/agoric-sdk/issues/12233)) ([6ad0038](https://github.com/Agoric/agoric-sdk/commit/6ad0038710094d4601a4c00c0e6ff6c32a66425f))
* **portfolio-contract:** Propagate graph arc minimum flow into LP solver input ([249072d](https://github.com/Agoric/agoric-sdk/commit/249072dfa4bf6ba0ec38ac66b891c3e7fda9e3a0))
* **portfolio-contract:** Remove direct CCTPv2 routes from the production network ([#12454](https://github.com/Agoric/agoric-sdk/issues/12454)) ([754698c](https://github.com/Agoric/agoric-sdk/commit/754698ceecae0bf068be0022082e672ff4bc71cb)), closes [#12427](https://github.com/Agoric/agoric-sdk/issues/12427)
* **portfolio-contract:** report makeAccount errors to vstorage ([0840a70](https://github.com/Agoric/agoric-sdk/commit/0840a70803b00b329620180b621b163f43539e13))
* **portfolio-contract:** resolve IBC channel mismatches and async flow issues in test mocks ([1d7da99](https://github.com/Agoric/agoric-sdk/commit/1d7da99db179d3381171aa3d5425a10b26494b2e))
* **portfolio-contract:** rework the `pendingTx` shapes ([5a1388a](https://github.com/Agoric/agoric-sdk/commit/5a1388a00b5dfe8e512c57b9b44acdf3252136ca))
* **portfolio-contract:** Start a flow when openPortfolio includes an initial deposit ([9be0f2c](https://github.com/Agoric/agoric-sdk/commit/9be0f2c9a66727675dcbd77f713ea15a109b4177)), closes [#12114](https://github.com/Agoric/agoric-sdk/issues/12114)
* **portfolio:** remove Access token requirement and add upgrade coverage ([0f6be68](https://github.com/Agoric/agoric-sdk/commit/0f6be687c001c05db573ed86f60c03e865284523))
* previously failed accounts must be resolved/released ([3d7f4d0](https://github.com/Agoric/agoric-sdk/commit/3d7f4d05d34e533c9456b20539e9544a9a6faeca))
* rebalance handles stepFlow failure ([9bcc720](https://github.com/Agoric/agoric-sdk/commit/9bcc720aeba4a303a2ae33c9d91eaf7a61920153))
* register transaction before sending GMP makeAccount ([b8d98c9](https://github.com/Agoric/agoric-sdk/commit/b8d98c9da3edb44c57a74dbd344a3dfd1434d7db))
* Remove automatic flow recovery ([ef28bb3](https://github.com/Agoric/agoric-sdk/commit/ef28bb33e1eaf96b38d849aab811484e943d9e48))
* remove unused network definitions ([5b8a504](https://github.com/Agoric/agoric-sdk/commit/5b8a5044658680005dbb3a9ec18dcc235bd5f324))
* Revert "feat: upgrade Interchain Stack dependencies to Cosmos v0.53 ([#12508](https://github.com/Agoric/agoric-sdk/issues/12508))" ([#12569](https://github.com/Agoric/agoric-sdk/issues/12569)) ([2858da6](https://github.com/Agoric/agoric-sdk/commit/2858da6fc8a98390073a521783cafbc159c36170))
* **scheduler:** avoid duplicate cascade failures ([16867a9](https://github.com/Agoric/agoric-sdk/commit/16867a90fa8684604ad8a781d1f090af98b337fa))
* **scheduler:** handle sync task throws ([5724316](https://github.com/Agoric/agoric-sdk/commit/572431689ec0fa6296d13fd16394353b23af017e))
* **scheduler:** wait for running tasks before completion ([f60fa92](https://github.com/Agoric/agoric-sdk/commit/f60fa92ef0a4335545882b408da5c36a1f150bf9))
* startFlow releases pending accounts ([aa23f99](https://github.com/Agoric/agoric-sdk/commit/aa23f994ca072c5484743f0f03b4eda139e2c2b8))
* test for consistency of declaration with contract ([1e0ffe6](https://github.com/Agoric/agoric-sdk/commit/1e0ffe6bcafcc68e319284b2c4d76034200808c8))
* **test:** mock vowTools.watch() and update aave test ([abbcc3a](https://github.com/Agoric/agoric-sdk/commit/abbcc3a6153fea04fed3fe5625e4fbf1de2082a9))
* **test:** update receiveUpCall and enable skipped tests ([a4b7725](https://github.com/Agoric/agoric-sdk/commit/a4b7725898b3eb2c9d6db9327e98c09fab7067a7))
* throw on missing GMP makeAccount fee ([9022f9c](https://github.com/Agoric/agoric-sdk/commit/9022f9c4974ac611c451f2a2b0902da2de2c39a1))
* typo ([8278bcb](https://github.com/Agoric/agoric-sdk/commit/8278bcbe4e3223138b256a8db2fc5e5d4cc0d3f6))
* unsubscribe resolver on GMP send failure ([c536c66](https://github.com/Agoric/agoric-sdk/commit/c536c66d282fe22b0f0fd9986565a3b0e9297329))
* use `Codec` and `CodecHelper` where appropriate ([f268e4a](https://github.com/Agoric/agoric-sdk/commit/f268e4ac6f52e8bf07f858d051d05ef8d8fac9b3))
* use buildGasPayload for remote account creation ([#11768](https://github.com/Agoric/agoric-sdk/issues/11768)) ([9608fa8](https://github.com/Agoric/agoric-sdk/commit/9608fa87911913da957f5cf09858051e39588281))
* use GMP type 2 to set outbound/inbound gas for GMP calls ([eac634d](https://github.com/Agoric/agoric-sdk/commit/eac634d1c349782c8b851b7e83cc7c66c1aa98da))
* use makeOnce for resolver exo ([a40dbe8](https://github.com/Agoric/agoric-sdk/commit/a40dbe8367ae2fca944faba3f83a8a2290c916cc))
* **ymax-planner:** Ensure that nonrecoverable failures are detected ([d67308f](https://github.com/Agoric/agoric-sdk/commit/d67308f5f78888ac3195f39211cb95e0c8c7b22e))
* **ymax-planner:** Establish a 1 USDC minimum for noble-to-EVM arcs ([5707009](https://github.com/Agoric/agoric-sdk/commit/57070099b7c39d8e018e813ee358ae81e2d52a46))
* **ymax-planner:** Log warnings/errors rather than crashing ([592dbaa](https://github.com/Agoric/agoric-sdk/commit/592dbaa2081c3b35fd19aebabf48fd52ee4a51ed))

### Reverts

* Revert "chore: hardcode 15BLD as fee if move.fee is not defined" ([08a4f61](https://github.com/Agoric/agoric-sdk/commit/08a4f61953e947aa6242b7e476c65dd4331c1e92))

### Miscellaneous Chores

* **portfolio-contract:** Simplify RebalanceGraph and rename to FlowGraph ([580122a](https://github.com/Agoric/agoric-sdk/commit/580122a7dc9251401f814eb6d9334f7d8f46eaae))

## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-contract@0.2.0-u22.2...@aglocal/portfolio-contract@0.2.0) (2026-04-02)

**Note:** Version bump only for package @aglocal/portfolio-contract

## [0.2.0-u22.2](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-contract@0.2.0-u22.1...@aglocal/portfolio-contract@0.2.0-u22.2) (2025-09-09)

**Note:** Version bump only for package @aglocal/portfolio-contract

## [0.2.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-contract@0.2.0-u22.0...@aglocal/portfolio-contract@0.2.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @aglocal/portfolio-contract

## 0.2.0-u22.0 (2025-09-08)

### Features

* add claim rewards functions for aave and compound ([25eb411](https://github.com/Agoric/agoric-sdk/commit/25eb4113a20fc6d1a9ae777c290ded8f4d0d14cf))
* add environment-based axelar chain configuration ([39ad0af](https://github.com/Agoric/agoric-sdk/commit/39ad0afb9b0551df57b5ad67c5aef3270239fdb7))
* add protocol for beefy ([e90b59d](https://github.com/Agoric/agoric-sdk/commit/e90b59d9c0b911d71c38054468d063d14396c727))
* adding a cctp status to vstorage so it is readable by ymax planner ([8226385](https://github.com/Agoric/agoric-sdk/commit/8226385187c6c146b13fdf0c7e7cf3b5b4f12ff0))
* bump poc token from 24/25 to 26 ([0bb4608](https://github.com/Agoric/agoric-sdk/commit/0bb46081e143a63718c4e781a3844af85a5f033b))
* CCTP tx confirmation handler ([568e80b](https://github.com/Agoric/agoric-sdk/commit/568e80bb627cafebedc0c70d42d01374a803ada4))
* deploy funds to aave and compound ([526b4ab](https://github.com/Agoric/agoric-sdk/commit/526b4abfaadeb719155726f3c089b0429a84c852))
* for Noble Dollar, client can give USDN out with USDC in ([4546225](https://github.com/Agoric/agoric-sdk/commit/454622526d38a3015e9a70023e750956b0a296d1))
* gmp calls for aave ([bbeb5c2](https://github.com/Agoric/agoric-sdk/commit/bbeb5c2f601bcbafe6fb60fe5f3bea56869735db))
* handle GMP and CCTP transactions off-chain ([#11752](https://github.com/Agoric/agoric-sdk/issues/11752)) ([7cb1020](https://github.com/Agoric/agoric-sdk/commit/7cb1020532ba8a386b4e1c37c0cd4f62a1d13f7e)), closes [#11709](https://github.com/Agoric/agoric-sdk/issues/11709)
* limit steps to 12 ([a7dad02](https://github.com/Agoric/agoric-sdk/commit/a7dad02f7b1d356d9941f9f6ec9805aba855b03b))
* pass axelar gmp addresses via privateArgs ([9065bdc](https://github.com/Agoric/agoric-sdk/commit/9065bdc4a400be6722404e01cf3ff88eb3475608))
* **portfolio-contract:** gate access with a PoC token ([ad72c75](https://github.com/Agoric/agoric-sdk/commit/ad72c753cb493929ca85c668409f575ec65a53c2))
* **portfolio-contract:** offer specifies steps; BLD for GMP fees ([1535efa](https://github.com/Agoric/agoric-sdk/commit/1535efaa97abca5bc8f28b506913fdf25ba48330))
* **portfolio-contract:** open portfolio w/USDN position ([2fa1c42](https://github.com/Agoric/agoric-sdk/commit/2fa1c425fc472b5d2f682392eccc4263a5113710))
* **portfolio-contract:** publish portfolios, positions, flows ([9f32a25](https://github.com/Agoric/agoric-sdk/commit/9f32a25dd6ea6bc7dd8fe57f6965ee81aef9d5c3))
* **portfolio-contract:** rebalance: open USDN or Aave position ([3e58d66](https://github.com/Agoric/agoric-sdk/commit/3e58d66f35cde5e0b6184ab9b32c1a815cac48d1))
* **portfolio-contract:** set target allocation ([d218c07](https://github.com/Agoric/agoric-sdk/commit/d218c0752993cf5f6c7d88bbb7ce0c26dd46c29a))
* **portfolio-contract:** typed patterns for vstorage ([48dbf68](https://github.com/Agoric/agoric-sdk/commit/48dbf683dd94698aad384bccb28f2b3e1c5a7c74))
* **portfolio-contract:** use CCTP TokenMessenger to go EVM->Noble ([89ab245](https://github.com/Agoric/agoric-sdk/commit/89ab245b6d67cdf06e238631c2bba5a6ea2a5b34))
* publish axelar chains data on agoricNames ([75f28bc](https://github.com/Agoric/agoric-sdk/commit/75f28bc8df97687761e1fc456bf94bc13b82d024))
* send tokens to EVM chain via CCTP ([2e08984](https://github.com/Agoric/agoric-sdk/commit/2e08984acd045825725c60f88d608f0c47c0f0d3))
* withdraw from USDN ([411bde1](https://github.com/Agoric/agoric-sdk/commit/411bde16ea9f7a07aad117b14de78e701c114075))
* ymax contract restartable ([0d237a3](https://github.com/Agoric/agoric-sdk/commit/0d237a39cfd8c42978126feb5871f973f3eea53f))
* ymax planner ([43ae048](https://github.com/Agoric/agoric-sdk/commit/43ae04896dc7b08baa0daacd56cb84741ef114d1))

### Bug Fixes

* align vstorage posted data with expected resolver handler status ([#11815](https://github.com/Agoric/agoric-sdk/issues/11815)) ([fea7786](https://github.com/Agoric/agoric-sdk/commit/fea77864ae4355e4d7aa750e3008ad4899949c14)), closes [#11752](https://github.com/Agoric/agoric-sdk/issues/11752)
* correct contract addresses from gmp calls ([e30c43e](https://github.com/Agoric/agoric-sdk/commit/e30c43e5fe48258e9e268f65ca675b37663c5966))
* decoding address from ethereum ([1ed9435](https://github.com/Agoric/agoric-sdk/commit/1ed9435a9d4eb6c74bc0e760346a19077d71e49e))
* ensure unique contract addresses per chain ([69e3649](https://github.com/Agoric/agoric-sdk/commit/69e36494e62bf5774b73f04e91d7519a43bec78b))
* make ethereum value capitalized ([17526bc](https://github.com/Agoric/agoric-sdk/commit/17526bcdea2c940f7bdbe294d7de0b511a749610))
* PoolKeyShape extensibility ([bd7fa4b](https://github.com/Agoric/agoric-sdk/commit/bd7fa4bf4b23e5825de179200e30974e061237df))
* **portfolio-contract:** don't make new storage nodes on each update ([b10a8c1](https://github.com/Agoric/agoric-sdk/commit/b10a8c15a168dc7b527f83015c2b44d14204052b))
* rebalance handles stepFlow failure ([9bcc720](https://github.com/Agoric/agoric-sdk/commit/9bcc720aeba4a303a2ae33c9d91eaf7a61920153))
* **test:** mock vowTools.watch() and update aave test ([abbcc3a](https://github.com/Agoric/agoric-sdk/commit/abbcc3a6153fea04fed3fe5625e4fbf1de2082a9))
* **test:** update receiveUpCall and enable skipped tests ([a4b7725](https://github.com/Agoric/agoric-sdk/commit/a4b7725898b3eb2c9d6db9327e98c09fab7067a7))
* use `Codec` and `CodecHelper` where appropriate ([f268e4a](https://github.com/Agoric/agoric-sdk/commit/f268e4ac6f52e8bf07f858d051d05ef8d8fac9b3))
* use buildGasPayload for remote account creation ([#11768](https://github.com/Agoric/agoric-sdk/issues/11768)) ([9608fa8](https://github.com/Agoric/agoric-sdk/commit/9608fa87911913da957f5cf09858051e39588281))
* use GMP type 2 to set outbound/inbound gas for GMP calls ([eac634d](https://github.com/Agoric/agoric-sdk/commit/eac634d1c349782c8b851b7e83cc7c66c1aa98da))

# Changelog

All notable changes to this project will be documented in this file.

See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.

## [0.1.3-alpha] 2025-08-18

### Features

 - beefy protocol
 - claim rewards for aave and compound
 - set target allocation
 - portfolio depositAddress
 - ymax0.portfolios vstorage key updates on creation
 - planning tools for ymax planner
 - ymax contract restartable

### Notes

 - perf: don't make new storage nodes on each update
 - docs: create sequence diagrams for several user stories
 - pass axelar gmp addresses via privateArgs
 - docs to articulate planner's responsibilities
 - refactor: portfolio constants into new API package
 - Commit: [`65740e1`](https://github.com/Agoric/agoric-sdk/commit/65740e135c794987d86381deef225a83eefcdefd)

[0.1.3-alpha]: https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.1.3-alpha

## [0.1.1-alpha] 2025-07-30

_changes to portfolio-deploy package only_

- Commit: [`8e37faa `](https://github.com/Agoric/agoric-sdk/commit/8e37faaf5265f55433fc80e67c8785a66480c7f4)

[0.1.1-alpha]: https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.1.1-alpha

## [0.1.0-alpha] - 2024-07-15

### Features

- Initial portfolio contract implementation for diversified stablecoin yield management
- Support for multiple yield protocols (USDN, Aave, Compound)
- Cross-chain portfolio rebalancing via Noble and Axelar GMP
- Portfolio position tracking and flow logging to vstorage
- Continuing invitations for ongoing portfolio management
- Build system with governance proposal generation
- Access token setup for portfolio permissions

### Notes
- This is a proof-of-concept alpha release
- Contract name: `ymax0`
- Commit: [`f741807`](https://github.com/Agoric/agoric-sdk/commit/f741807aff5929acabc007380c4a057882a35147)

[0.1.0-alpha]: https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.1-alpha
