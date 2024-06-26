# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u16.0 (2024-06-26)


### ⚠ BREAKING CHANGES

* export heapVowTools

### Features

* **async-flow:** asyncFlow ([#9097](https://github.com/Agoric/agoric-sdk/issues/9097)) ([16095c5](https://github.com/Agoric/agoric-sdk/commit/16095c5076043133aff0f25721131be2ca1ef5af)), closes [#9302](https://github.com/Agoric/agoric-sdk/issues/9302) [#9125](https://github.com/Agoric/agoric-sdk/issues/9125) [#9126](https://github.com/Agoric/agoric-sdk/issues/9126) [#9153](https://github.com/Agoric/agoric-sdk/issues/9153) [#9154](https://github.com/Agoric/agoric-sdk/issues/9154) [#9280](https://github.com/Agoric/agoric-sdk/issues/9280) [#9126](https://github.com/Agoric/agoric-sdk/issues/9126)
* export heapVowE ([21c5897](https://github.com/Agoric/agoric-sdk/commit/21c5897d28e0716ccbecd6543aa9d50e22c9348c))
* export heapVowTools ([d68401a](https://github.com/Agoric/agoric-sdk/commit/d68401a94c919cc7fc66da52abd985146ea7ad3f))
* **ibc:** add types for IBCEvent, IBCMethod, IBCDowncall, and IBCDowncallPacket ([54fc93c](https://github.com/Agoric/agoric-sdk/commit/54fc93c1362d9131ec0803abea785ad303757e43))
* **vow:** make `when` an augmentation of `E.when` ([c2a3179](https://github.com/Agoric/agoric-sdk/commit/c2a31792b7070a44b2ab6c9f95dd845b75b316e8))
* **vow:** third argument to `watch` is watcher context ([c579633](https://github.com/Agoric/agoric-sdk/commit/c579633ceb9c6a94c0998993caec9fc28d02e214))
* **vow:** VowShape, isVow ([#9154](https://github.com/Agoric/agoric-sdk/issues/9154)) ([db4d0ea](https://github.com/Agoric/agoric-sdk/commit/db4d0eab68a1d361ddbb6fe993ff0b9969a348e5))


### Bug Fixes

* **vow:** allow resolving vow to external promise ([945a60c](https://github.com/Agoric/agoric-sdk/commit/945a60cfdadd90716340b5122c4008b56225af7a))
* **vow:** clearer `Unwrap<T>` and `Remote<T>` ([025175b](https://github.com/Agoric/agoric-sdk/commit/025175bdd76209fe788b78e669b1ccaec88b4623))
* **vow:** correct the typing of `unwrap` ([2af609f](https://github.com/Agoric/agoric-sdk/commit/2af609ff38c928b94ae3864845a471d9a70f6997))
* **vow:** handle resolution loops in vows ([#9561](https://github.com/Agoric/agoric-sdk/issues/9561)) ([dd1a7db](https://github.com/Agoric/agoric-sdk/commit/dd1a7dbb56c2d7bfebaba632b9e0a7f6c39bb48e)), closes [#9560](https://github.com/Agoric/agoric-sdk/issues/9560)
* **vow:** persistent resolution, settler->resolver ([4d9371c](https://github.com/Agoric/agoric-sdk/commit/4d9371cb7d450e25146787474760b4c00b11e405))
* **vow:** prevent loops and hangs from watching promises ([3541b04](https://github.com/Agoric/agoric-sdk/commit/3541b040e40006a86330deecc03c9393466ae013))
* **vow:** simplify `watch` and promptly register reactions ([c52edaa](https://github.com/Agoric/agoric-sdk/commit/c52edaa3d07fdb9e18c6d6628b83ff62e7615617))
* **vow:** use `zone.watchPromise` ([b8ddc9d](https://github.com/Agoric/agoric-sdk/commit/b8ddc9d1ddf06fed8b434f36aa86a2a70293fd56))
* **vow:** watcher args instead of context ([#9556](https://github.com/Agoric/agoric-sdk/issues/9556)) ([bee606f](https://github.com/Agoric/agoric-sdk/commit/bee606f58a71af9b98440b13d70bc417fa7ed7d7)), closes [#9555](https://github.com/Agoric/agoric-sdk/issues/9555)
