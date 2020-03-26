# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
