# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u21.0 (2025-06-19)


### ⚠ BREAKING CHANGES

* export heapVowTools

### Features

* **async-flow:** asyncFlow ([#9097](https://github.com/Agoric/agoric-sdk/issues/9097)) ([16095c5](https://github.com/Agoric/agoric-sdk/commit/16095c5076043133aff0f25721131be2ca1ef5af)), closes [#9302](https://github.com/Agoric/agoric-sdk/issues/9302) [#9125](https://github.com/Agoric/agoric-sdk/issues/9125) [#9126](https://github.com/Agoric/agoric-sdk/issues/9126) [#9153](https://github.com/Agoric/agoric-sdk/issues/9153) [#9154](https://github.com/Agoric/agoric-sdk/issues/9154) [#9280](https://github.com/Agoric/agoric-sdk/issues/9280) [#9126](https://github.com/Agoric/agoric-sdk/issues/9126)
* chainHub retries ([ec65bfa](https://github.com/Agoric/agoric-sdk/commit/ec65bfa61e592f43d6e9cd9cda422300e79813f1))
* export heapVowE ([9128f27](https://github.com/Agoric/agoric-sdk/commit/9128f279a2dea75e99a9b250e159c917c07cdfff))
* export heapVowTools ([100de68](https://github.com/Agoric/agoric-sdk/commit/100de68330ffd7d56a3e4fdefc591380e2a3307f))
* **ibc:** add types for IBCEvent, IBCMethod, IBCDowncall, and IBCDowncallPacket ([54fc93c](https://github.com/Agoric/agoric-sdk/commit/54fc93c1362d9131ec0803abea785ad303757e43))
* **lint:** exempt connectionHandler notification methods from resumable rule ([f409a8d](https://github.com/Agoric/agoric-sdk/commit/f409a8dd899cd0eb8c24ba2dba12724dafaae03c))
* loosen watcher type guards to support non-passables ([5135b9c](https://github.com/Agoric/agoric-sdk/commit/5135b9c2068dd563813f0005da24b7b9884a5301))
* retriable helper ([97a856b](https://github.com/Agoric/agoric-sdk/commit/97a856becae8ce4c611695afca27998822749649))
* **types:** EVow ([3d5a3f3](https://github.com/Agoric/agoric-sdk/commit/3d5a3f3e44e328e102d7db197c0b06b18a5c63fe))
* **vow:** abandoned errors are retriable ([1ac054f](https://github.com/Agoric/agoric-sdk/commit/1ac054ffcbf665b885ec55944a0652023139387f))
* **vow:** make `when` an augmentation of `E.when` ([c2a3179](https://github.com/Agoric/agoric-sdk/commit/c2a31792b7070a44b2ab6c9f95dd845b75b316e8))
* **vow:** retryable tools ([5303913](https://github.com/Agoric/agoric-sdk/commit/53039135f760666f88ac0659f5e65c2c1b74a1d5))
* **vow:** third argument to `watch` is watcher context ([c579633](https://github.com/Agoric/agoric-sdk/commit/c579633ceb9c6a94c0998993caec9fc28d02e214))
* vowTools.allSettled ([3949b10](https://github.com/Agoric/agoric-sdk/commit/3949b107de79ccb2e46e14b2ab761f4ada742d25))
* **vowTools:** add asVow helper ([b6b5f5f](https://github.com/Agoric/agoric-sdk/commit/b6b5f5f7dd978b44dc865bbbe028cc76aa76543e)), closes [/github.com/Agoric/agoric-sdk/pull/9454#discussion_r1626898694](https://github.com/Agoric//github.com/Agoric/agoric-sdk/pull/9454/issues/discussion_r1626898694)
* **vowTools:** asPromise helper for unwrapping vows ([c940d5c](https://github.com/Agoric/agoric-sdk/commit/c940d5ca7356428d2bda78af17942dc76fef59dc))
* **vowTools:** asVow should not wrap a vow as a vow ([0cdcd5f](https://github.com/Agoric/agoric-sdk/commit/0cdcd5f32b0436db9e027d6ff8343f4cef570666))
* **vow:** VowShape, isVow ([#9154](https://github.com/Agoric/agoric-sdk/issues/9154)) ([db4d0ea](https://github.com/Agoric/agoric-sdk/commit/db4d0eab68a1d361ddbb6fe993ff0b9969a348e5))
* **watchUtils:** add asPromise helper ([bf430a1](https://github.com/Agoric/agoric-sdk/commit/bf430a12afa853b332fd6cfdcb77781d544b0e7c))
* **watchUtils:** handle non-storables ([8c27c67](https://github.com/Agoric/agoric-sdk/commit/8c27c6725ba7ef4b71d3ab0ccfdbddd755bcd926))


### Bug Fixes

* **orchestration:** do not call `getTimeoutTimestampNS` if `opts.timeoutTimestamp` is provided ([c162426](https://github.com/Agoric/agoric-sdk/commit/c162426f6a20b375113fae9ab82c0ba4ab87841d))
* **vow:** allow resolving vow to external promise ([44a6d16](https://github.com/Agoric/agoric-sdk/commit/44a6d16b9ff99fe9a3222cb4a32a34d3ad456fed))
* **vow:** clearer `Unwrap<T>` and `Remote<T>` ([025175b](https://github.com/Agoric/agoric-sdk/commit/025175bdd76209fe788b78e669b1ccaec88b4623))
* **vow:** clearer stored/non-stored values ([274df18](https://github.com/Agoric/agoric-sdk/commit/274df1833f000af9971d2015a25afd89d89fdbf6))
* **vow:** correct the typing of `unwrap` ([40ccba1](https://github.com/Agoric/agoric-sdk/commit/40ccba14680f9acf4a68ef32751eb3ac57a4c9bd))
* **vow:** export vat-compatible tools by default ([c3038c6](https://github.com/Agoric/agoric-sdk/commit/c3038c6ddd79cd781480c0b732f0de6b7f91742c))
* **vow:** handle resolution loops in vows ([#9561](https://github.com/Agoric/agoric-sdk/issues/9561)) ([a4f86eb](https://github.com/Agoric/agoric-sdk/commit/a4f86eb7fd602980a40d00d739897090d3667d3d)), closes [#9560](https://github.com/Agoric/agoric-sdk/issues/9560)
* **vow:** include vat.js in package files ([b6ffa6f](https://github.com/Agoric/agoric-sdk/commit/b6ffa6f09e4e453b1fe3bd2c62a55b05dccb1857))
* **vow:** persistent resolution, settler->resolver ([4d9371c](https://github.com/Agoric/agoric-sdk/commit/4d9371cb7d450e25146787474760b4c00b11e405))
* **vow:** prevent loops and hangs from watching promises ([3c63cba](https://github.com/Agoric/agoric-sdk/commit/3c63cba0261457c25dc35d560f5bb5a0af591962))
* **vow:** report unhandled rejections on vow collection or upgrade ([7277f0e](https://github.com/Agoric/agoric-sdk/commit/7277f0ef1a55fc6b19edd84e25ae6f180115c686))
* **vow:** simplify `watch` and promptly register reactions ([c52edaa](https://github.com/Agoric/agoric-sdk/commit/c52edaa3d07fdb9e18c6d6628b83ff62e7615617))
* **vow:** use `zone.watchPromise` ([b8ddc9d](https://github.com/Agoric/agoric-sdk/commit/b8ddc9d1ddf06fed8b434f36aa86a2a70293fd56))
* **vow:** watch-utils leak in non storable results ([#11117](https://github.com/Agoric/agoric-sdk/issues/11117)) ([9f21b9d](https://github.com/Agoric/agoric-sdk/commit/9f21b9da5795a457f502cec78ff2602e4cbc1b26)), closes [#10955](https://github.com/Agoric/agoric-sdk/issues/10955) [#10794](https://github.com/Agoric/agoric-sdk/issues/10794) [#10955](https://github.com/Agoric/agoric-sdk/issues/10955)
* **vow:** watcher args instead of context ([#9556](https://github.com/Agoric/agoric-sdk/issues/9556)) ([0af876f](https://github.com/Agoric/agoric-sdk/commit/0af876fb087f76a8144730969bb88b13403d02db)), closes [#9555](https://github.com/Agoric/agoric-sdk/issues/9555)
* **vow:** when honors rejection handler ([b656ada](https://github.com/Agoric/agoric-sdk/commit/b656ada08b8839e602e86298c94c7b874b04d51d))
