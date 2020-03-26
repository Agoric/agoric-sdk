# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.4.0 (2020-03-26)


### Bug Fixes

* accomodate modified offer ids ([38d367d](https://github.com/Agoric/agoric/commit/38d367dedcba143524b4668573f11b757233401b))
* address PR comments ([b9ed6b5](https://github.com/Agoric/agoric/commit/b9ed6b5a510433af968ba233d4e943b939defa1b))
* allow disabling of logging by setting DEBUG='' ([131c1c6](https://github.com/Agoric/agoric/commit/131c1c64f646f2fa3adece698d1da240dc969f03))
* fix discrepencies revealed by the agoric-cli test ([422b019](https://github.com/Agoric/agoric/commit/422b01946481f549e15c8d36270146e5729855f7))
* make the changes needed to cancel pending offers ([b4caa9e](https://github.com/Agoric/agoric/commit/b4caa9ed26489ad39651b4717d09bd9f84557480))
* make the fake-chain better ([b4e5b02](https://github.com/Agoric/agoric/commit/b4e5b02ca8fc5b6df925391f3b0a2d6faecbdb73))
* polish the wallet and dApp UIs ([292291f](https://github.com/Agoric/agoric/commit/292291f234646cdb0685dbf63cf0a75a2491018c))
* properly kill off child processes on SIGHUP ([93b71cd](https://github.com/Agoric/agoric/commit/93b71cd6b894cbd37dab39b6946ed8e6d47ab2a6))
* reenable package.json substitutions ([10bece7](https://github.com/Agoric/agoric/commit/10bece74cdb9608f069d7f2b4c3534368ce2ea5d))
* regression in `agoric start --reset` ([206ecd0](https://github.com/Agoric/agoric/commit/206ecd088f1bc2bb33c15c3f8c134fe2d8b4f39e))
* rename .agwallet and .agservers into _agstate ([a82d44f](https://github.com/Agoric/agoric/commit/a82d44fe370d32f8383e4558c7b03f3d13a2f163))
* revert usage of SIGHUP to SIGINT ([2948400](https://github.com/Agoric/agoric/commit/294840026ef81bd19407c91bb92b68e4b5e13198))
* run mkdir with recursive option to prevent exceptions ([a01fa04](https://github.com/Agoric/agoric/commit/a01fa04c2955e0f00f3bc29aa3862c2440a23c8e)), closes [#662](https://github.com/Agoric/agoric/issues/662)
* silence the builtin modules warning in agoric-cli deploy ([9043516](https://github.com/Agoric/agoric/commit/904351655f8acedd5720e5f0cc3ace83b5cf6192))
* **ag-solo:** reenable the ag-solo bundle command ([6126774](https://github.com/Agoric/agoric/commit/6126774fd3f102cf575a430dfddb3a0c6adcf0f5)), closes [#606](https://github.com/Agoric/agoric/issues/606)
* **agoric-cli:** changes to make `agoric --sdk` basically work again ([#459](https://github.com/Agoric/agoric/issues/459)) ([1dc046a](https://github.com/Agoric/agoric/commit/1dc046a02d5e616d33f48954e307692b43008442))
* **agoric-cli:** install the SDK symlink if requested ([f7fd68f](https://github.com/Agoric/agoric/commit/f7fd68f8aa301a14a110f403c1970d0bd1c1a51f))
* **captp:** use new @agoric/eventual-send interface ([d1201a1](https://github.com/Agoric/agoric/commit/d1201a1a1de324ae5e21736057f3bb03f97d2bc7))
* **cli:** improve install, template, fake-chain ([0890171](https://github.com/Agoric/agoric/commit/08901713bd3db18b52ed1793efca21b459e3713e))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/agoric/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **init:** handle symbolic links and ignored files properly ([2d6b876](https://github.com/Agoric/agoric/commit/2d6b87604d6a1bc97028a89f1f3b8c59a7f3a991))
* **security:** update serialize-javascript dependency ([#340](https://github.com/Agoric/agoric/issues/340)) ([970edd3](https://github.com/Agoric/agoric/commit/970edd31a8caa36235fad860b3b0ee8995042d7a))
* **start:** eliminate default fake delay, and add --delay option ([28ce729](https://github.com/Agoric/agoric/commit/28ce7298370ec81ae37dcc15db3b162974eea39a)), closes [#572](https://github.com/Agoric/agoric/issues/572)
* **start:** parse `--pull` properly ([a5ac2c9](https://github.com/Agoric/agoric/commit/a5ac2c956c47e94ef79be53b683d48e8146a7b05))
* **SwingSet:** passing all tests ([341718b](https://github.com/Agoric/agoric/commit/341718be335e16b58aa5e648b51a731ea065c1d6))


### Features

* add anylogger support ([4af822d](https://github.com/Agoric/agoric/commit/4af822d0433ac2b0d0fd53298e8dc9c7347a3e11))
* default to silent unles `DEBUG=agoric` ([2cf5cd8](https://github.com/Agoric/agoric/commit/2cf5cd8ec66d1ee38f351be8b2e3c808afd554a9))
* implement wallet bridge separately from wallet user ([41c1278](https://github.com/Agoric/agoric/commit/41c12789c1fd230fa8442db9e3979d0c7372025a))
* **init:** use --dapp-template (default @agoric/dapp-simple-exchange) ([3bdf8ff](https://github.com/Agoric/agoric/commit/3bdf8ff4476279fbb158953ec115939794d4488e))
* **link-cli:** install the Agoric CLI locally ([5e38c5a](https://github.com/Agoric/agoric/commit/5e38c5a333a09ceb7429b2a843d7e66ebb56dfc6))
* **start:** implement `agoric start testnet` ([cbfb306](https://github.com/Agoric/agoric/commit/cbfb30604b8c2781e564bb250dd58d08c7d57b3c))
