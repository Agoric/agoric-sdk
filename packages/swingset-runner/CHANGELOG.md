# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.2...@agoric/swingset-runner@0.5.0) (2020-06-30)


### Bug Fixes

* deal more gracefully with data sources that have a common base file name ([f05f3ba](https://github.com/Agoric/agoric-sdk/commit/f05f3ba70879d0312446f930881f32192fae42d6))
* eslint is tricksy, it is ([1245ebb](https://github.com/Agoric/agoric-sdk/commit/1245ebb686fd20112f17f6c3f5f422de76709e19))
* miscellaneous cleanups ([b184312](https://github.com/Agoric/agoric-sdk/commit/b184312046fa3425b8051601eece3bc5f9d68889))


### Features

* add benchmarking support to swingset-runner ([19a4ef7](https://github.com/Agoric/agoric-sdk/commit/19a4ef7b87c661b6774a4532e401dd96a23b0a3d))
* add facility for capturing and graphing kernel stats ([0df83b3](https://github.com/Agoric/agoric-sdk/commit/0df83b3b198632003abd38026b3136e21f99cd0b))
* add hook to pre-execute one round of benchmarking before starting to measure ([890f88a](https://github.com/Agoric/agoric-sdk/commit/890f88a511e8346c926a4c6fbf2f2320b404a9c2))
* add stats dumping capability to swingset runner and kernel dumper ([83efadc](https://github.com/Agoric/agoric-sdk/commit/83efadc6325ea78097d00401888712f15ccf1dce))
* count number of times various stats variables are incremented and decremented ([129f02f](https://github.com/Agoric/agoric-sdk/commit/129f02fb3c5a44950fa0ab12a715fc2f18911c08))
* kernel promise reference counting ([ba1ebc7](https://github.com/Agoric/agoric-sdk/commit/ba1ebc7b2561c6a4c856b16d4a24ba38a40d0d74))
* support value return from `bootstrap` and other exogenous messages ([a432606](https://github.com/Agoric/agoric-sdk/commit/a43260608412025991bcad3a48b20a486c3dbe15))
* Zoe simpleExchange perf test in swingset-runner ([79da155](https://github.com/Agoric/agoric-sdk/commit/79da15578750485b25a64626248078aee844c42e))





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.1...@agoric/swingset-runner@0.4.2) (2020-05-17)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.0...@agoric/swingset-runner@0.4.1) (2020-05-10)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.3.0...@agoric/swingset-runner@0.4.0) (2020-05-04)


### Bug Fixes

* lint... ([1db8eac](https://github.com/Agoric/agoric-sdk/commit/1db8eacd5fdb0e6d6ec6d2f93bd29e7c9291da30))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* add crank number to kernel state ([75e5d53](https://github.com/Agoric/agoric-sdk/commit/75e5d53d36862e630b3ee8e9628d2237493eb8ae))
* Add support for dumping crank-by-crank snapshots of the kernel state as a swingset runs ([b49929e](https://github.com/Agoric/agoric-sdk/commit/b49929ed7139544e218601135bdfd3408ea770de))
* Improved console log diagnostics ([465329d](https://github.com/Agoric/agoric-sdk/commit/465329d1d7f740e82fa46da24be370e2081fcb33))





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.3.0-alpha.0...@agoric/swingset-runner@0.3.0) (2020-04-13)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.3.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.1...@agoric/swingset-runner@0.3.0-alpha.0) (2020-04-12)


### Bug Fixes

* shut up eslint ([fcc1ff3](https://github.com/Agoric/agoric-sdk/commit/fcc1ff33ffc26dde787c36413e094365e1d09c03))


### Features

* Be smarter about where database files are located. ([2eb1469](https://github.com/Agoric/agoric-sdk/commit/2eb14694a108899f1bafb725e3e0b4a34150a07f))
* new tool -- kernel state dump utility ([f55110e](https://github.com/Agoric/agoric-sdk/commit/f55110e0e4f5963faf1ff86895cd3d0120bb7eca))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.1-alpha.0...@agoric/swingset-runner@0.2.1) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.2.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.0...@agoric/swingset-runner@0.2.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-runner





# 0.2.0 (2020-03-26)


### Features

* Add option to force GC after every block, add 'help' command, clean up error reporting ([e639ee5](https://github.com/Agoric/agoric-sdk/commit/e639ee5d69ce27eef40a8f0c6c8726dd81f8de3d))
* Add PDF and stdout support to stat-logger graphing ([22238e7](https://github.com/Agoric/agoric-sdk/commit/22238e75eb3e0726a7385c783c8f7678c48884d8))
* Log (and graph) database disk usage ([9f9f5af](https://github.com/Agoric/agoric-sdk/commit/9f9f5af964d6661bb1d6bd1f2ea91098bcad62b0))
