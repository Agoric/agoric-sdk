# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.0-u22.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.7.0-u22.1...@agoric/telemetry@0.7.0-u22.2) (2025-09-09)

**Note:** Version bump only for package @agoric/telemetry

## [0.7.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.7.0-u22.0...@agoric/telemetry@0.7.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @agoric/telemetry

## [0.7.0-u22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.6.2...@agoric/telemetry@0.7.0-u22.0) (2025-09-08)

### Features

* Add the Prometheus slog sender module and load it per OTEL_EXPORTER_PROMETHEUS_PORT ([1dc1827](https://github.com/Agoric/agoric-sdk/commit/1dc182783ce191f0ba2131cb1f7b3042f287737a)), closes [#11045](https://github.com/Agoric/agoric-sdk/issues/11045)
* **cosmic-swingset:** add JS upgrade plan handler stub ([655133e](https://github.com/Agoric/agoric-sdk/commit/655133ed909b5d632dc033e992214a7b6a1b5ab1))
* **internal:** Add helper `unprefixedProperties` for environment variable consumption ([878fecf](https://github.com/Agoric/agoric-sdk/commit/878fecf4f5153fa80f48a27a8b79e67943b2d199))
* simple CircularBuffer with fs offsets ([8d9cb7a](https://github.com/Agoric/agoric-sdk/commit/8d9cb7abe96e8905f5aaa0927e02914ef09279c4))
* **telemetry:** context aware slog support new triggers ([03965d9](https://github.com/Agoric/agoric-sdk/commit/03965d90b86cf75ce7f6677861e3a0aa8ac70710))
* **telemetry:** ingest-slog explicitly supports `-` for stdin ([63367c4](https://github.com/Agoric/agoric-sdk/commit/63367c4aaf9bafbd6553a1f4cb808c96bc90845a))
* **telemetry:** ingest-slog throttle and flush per block ([2134944](https://github.com/Agoric/agoric-sdk/commit/21349448b3b9379a9da43218a59a7e7eaf4f5a9e))
* **telemetry:** Update slog sender JSON serialization of error instances ([5db996d](https://github.com/Agoric/agoric-sdk/commit/5db996d99830e61fad6eed373e2fb2dc810d662e))
* use writeSync slogSender ([47a2add](https://github.com/Agoric/agoric-sdk/commit/47a2adda72a5377eda181a425130cdc5a7fd7ff5))

### Bug Fixes

* ensure script main rejections exit with error ([abdab87](https://github.com/Agoric/agoric-sdk/commit/abdab879014a5c3124ebd0e9246995ac6b1ce6e5))
* Properly synchronize slog sender termination ([f83c01d](https://github.com/Agoric/agoric-sdk/commit/f83c01d89d80798e0922acdb498fcc7250560977))
* **telemetry:** add missing slog type ([1aec8d0](https://github.com/Agoric/agoric-sdk/commit/1aec8d05036f6b3c3e3730339d1829da6b4a9051))
* **telemetry:** async flight recorder read ([b7a19dd](https://github.com/Agoric/agoric-sdk/commit/b7a19dd9c106d9b31e6f9188f5d4df0bbb5132bf))
* **telemetry:** avoid polluting stdout in ingest-slog ([d4b8dfa](https://github.com/Agoric/agoric-sdk/commit/d4b8dfa91155789f7ceda5cc3cef06019b9527e7))
* **telemetry:** Empty context persisted when remaining beans are negative after run finish ([#10635](https://github.com/Agoric/agoric-sdk/issues/10635)) ([ad4e83e](https://github.com/Agoric/agoric-sdk/commit/ad4e83e0b6dff9716da91fd65d367d3acad1772e))
* **telemetry:** event name typo ([9e19321](https://github.com/Agoric/agoric-sdk/commit/9e19321ea8fed32d445d44169b32f5d94a93d61e))
* **telemetry:** Extend shutdown logic for slog-sender-pipe and otel-metrics ([7b8ccc8](https://github.com/Agoric/agoric-sdk/commit/7b8ccc82e641e5d11ccc6b8aebe524f75af829fe)), closes [#11175](https://github.com/Agoric/agoric-sdk/issues/11175)
* **telemetry:** flight recorder flush does sync ([d270202](https://github.com/Agoric/agoric-sdk/commit/d2702028d77c06f3b4de91ca711a3c45c685a477))
* **telemetry:** flight-recorder check second read size ([bfbacb2](https://github.com/Agoric/agoric-sdk/commit/bfbacb2b9f8de36f8f66b8cba8a88603fb7225e2))
* **telemetry:** flight-recorder ignores write after shutdown ([3d2bcb3](https://github.com/Agoric/agoric-sdk/commit/3d2bcb3c56ac24a0f991200b223e6af8514dc5b8))
* **telemetry:** handle new trigger slog events ([d32cb7e](https://github.com/Agoric/agoric-sdk/commit/d32cb7e9f406c25399321dc32e827b5018c38b69))
* **telemetry:** ingest-slog avoid writing progress file for stdin ([62589ca](https://github.com/Agoric/agoric-sdk/commit/62589ca7b6d4aaa9eb7042f95ec7aec633db27f9))
* **telemetry:** initialize empty flight-recorders ([0908258](https://github.com/Agoric/agoric-sdk/commit/0908258c159a18f2bace0f76fa25c485c0460d15))
* **telemetry:** Launch a slog sender subprocess with the correct environment ([1a60955](https://github.com/Agoric/agoric-sdk/commit/1a60955181f4e8b02b3b0d5a2f213d4cb051d7d3))
* **telemetry:** otel correctly pop upgrade span ([0ffdf00](https://github.com/Agoric/agoric-sdk/commit/0ffdf001bc8cbdc94081fedfeb4d2376902f4ffc)), closes [#8272](https://github.com/Agoric/agoric-sdk/issues/8272) [#9569](https://github.com/Agoric/agoric-sdk/issues/9569)
* **telemetry:** silence slogfile write errors ([91089d7](https://github.com/Agoric/agoric-sdk/commit/91089d7273ef3d41555b34d84471120d45602497))
* **telemetry:** timer-poll run.id ([#10672](https://github.com/Agoric/agoric-sdk/issues/10672)) ([3b478fb](https://github.com/Agoric/agoric-sdk/commit/3b478fb9e3fe7ded8dec1e83bab68760571f9071)), closes [#10357](https://github.com/Agoric/agoric-sdk/issues/10357) [#10357](https://github.com/Agoric/agoric-sdk/issues/10357)

### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.6.1...@agoric/telemetry@0.6.2) (2023-06-02)

**Note:** Version bump only for package @agoric/telemetry

### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.6.0...@agoric/telemetry@0.6.1) (2023-05-24)

**Note:** Version bump only for package @agoric/telemetry

## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.4.0...@agoric/telemetry@0.6.0) (2023-05-19)

### Features

* **cosmic-swingset:** basic snapshot wiring ([b1072d8](https://github.com/Agoric/agoric-sdk/commit/b1072d8b1ddabbb5f2835eb503c945fed3b6b080))
* **telemetry:** add shutdown ([84757ff](https://github.com/Agoric/agoric-sdk/commit/84757ff63c7f603954af9c6e85ce7a819938e5b0))
* **telemetry:** do not carry span stack corruption across blocks ([16eaa99](https://github.com/Agoric/agoric-sdk/commit/16eaa99caef56b73159b321894aa2dca52846a29))
* **telemetry:** Expose send errors in forceFlush ([7a9a8c6](https://github.com/Agoric/agoric-sdk/commit/7a9a8c6165d3cb1bc89289faddf355bc04cc9c1f))
* **telemetry:** fail otel slog sender in more cases ([4549903](https://github.com/Agoric/agoric-sdk/commit/45499031cbb2417d58a50087b857600a96f87fe8))
* **telemetry:** SLOGSENDER_FAIL_ON_ERROR ([db79fca](https://github.com/Agoric/agoric-sdk/commit/db79fcad8bc784d300acfd994ceab9a2b9c2a567))

### Bug Fixes

* **telemetry:** do not propagate errors through queue ([601d63b](https://github.com/Agoric/agoric-sdk/commit/601d63b53722bac479ad570e2f7dfc1016dae9c7))
* **telemetry:** fix various edge cases ([c54d996](https://github.com/Agoric/agoric-sdk/commit/c54d9962deaaefec4f2c9680d58d625644ef9b69))
* **telemetry:** handle missing syscalls ([0b8475b](https://github.com/Agoric/agoric-sdk/commit/0b8475be8616d81661962c9845315554e58a7f96))
* **telemetry:** handle paging `create-vat` ([84a7557](https://github.com/Agoric/agoric-sdk/commit/84a75573520b5cc24ba7cc29e054a66d81f06339))
* **telemetry:** handle smallcaps ([1adc8ce](https://github.com/Agoric/agoric-sdk/commit/1adc8ced2c5d65db8de4992d2273824f79020a2c))
* **telemetry:** Missing after-commit rename from [#6881](https://github.com/Agoric/agoric-sdk/issues/6881) ([8e211f8](https://github.com/Agoric/agoric-sdk/commit/8e211f8862dea52b1d952c51760d6690a7604d30))
* **telemetry:** partially undo [#6684](https://github.com/Agoric/agoric-sdk/issues/6684) ([b9fa85b](https://github.com/Agoric/agoric-sdk/commit/b9fa85b7307124e50cc3a84d3b694307cde55f54))
* **telemetry:** silence pipe sender rejections ([e502f92](https://github.com/Agoric/agoric-sdk/commit/e502f9293ed92b8d705447271aa4f010c6c6dcb6))
* **telemetry:** upgrade otel deps ([dc48759](https://github.com/Agoric/agoric-sdk/commit/dc4875992937f9648381efae70818fa767d4b901))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))

## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.4.0...@agoric/telemetry@0.5.0) (2023-02-17)

### Features

* **telemetry:** do not carry span stack corruption across blocks ([e150320](https://github.com/Agoric/agoric-sdk/commit/e150320d88ade61b0a7fa0a0c4992988885ad34d))

### Bug Fixes

* **telemetry:** fix various edge cases ([2c65492](https://github.com/Agoric/agoric-sdk/commit/2c6549289d1c484aff861c061a7730c4b1f284e7))
* **telemetry:** handle paging `create-vat` ([c9bef2f](https://github.com/Agoric/agoric-sdk/commit/c9bef2f994ddaabf88dac6249f3adbc21fa6b4a0))
* **telemetry:** upgrade otel deps ([2c9b017](https://github.com/Agoric/agoric-sdk/commit/2c9b017d301048e5782b3b8cf684392e00419221))

## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.3.0...@agoric/telemetry@0.4.0) (2022-10-05)

### Features

* **telemetry:** Support slog sender in subprocess ([9fa268f](https://github.com/Agoric/agoric-sdk/commit/9fa268fc9b59d9fb26d829300d7a9d5a768e47bc))
* **telemetry:** Support SLOGSENDER_AGENT_ env prefix ([e504005](https://github.com/Agoric/agoric-sdk/commit/e50400527a03d32fdf34a30fd29229f98e9baf5c))

### Bug Fixes

* cleanup, update, and refactor slog-to-otel converter ([225f1dd](https://github.com/Agoric/agoric-sdk/commit/225f1dda46ec99dbc47ba39b3a99e278a4c1adbb)), closes [#4585](https://github.com/Agoric/agoric-sdk/issues/4585)
* **telemetry:** forceFlush is async ([5cf56b9](https://github.com/Agoric/agoric-sdk/commit/5cf56b9d22a4e9436f1ce1b5020ea68071ef7f55))
* **telemetry:** further prevent duplication of slog senders ([c7a3fc4](https://github.com/Agoric/agoric-sdk/commit/c7a3fc46526b3ecf05b0f3b2b86983b788467423))
* **telemetry:** slog sender errors should never propagate ([593aaae](https://github.com/Agoric/agoric-sdk/commit/593aaae57489bb8bfd1217dc995d7d6e4d395ab4))

## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.2.1...@agoric/telemetry@0.3.0) (2022-09-20)

### Features

* **cosmic-swingset:** add commit-block slog events ([8335928](https://github.com/Agoric/agoric-sdk/commit/8335928e933b96dc7db78a0895a7582b93ef4f73))
* **cosmic-swingset:** break up inbound queue processing ([e0d844d](https://github.com/Agoric/agoric-sdk/commit/e0d844da0cae132f63039404c42e5979c12977ce))
* **telemetry:** `otel-and-flight-recorder.js` for the best of both ([a191b34](https://github.com/Agoric/agoric-sdk/commit/a191b34bd6a4b14f7280b0886fcfd44b5a42b6b5))
* **telemetry:** flatten nested attributes ([2fc39ca](https://github.com/Agoric/agoric-sdk/commit/2fc39cab8ce3a080c96304af2d772943a653e420))

### Bug Fixes

* **telemetry:** handle missing slog events ([8e353da](https://github.com/Agoric/agoric-sdk/commit/8e353daf4eceac2eb90fddb6f651bc77f24d299c))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **kv-string-store:** allow keys to overwrite ([c28b393](https://github.com/Agoric/agoric-sdk/commit/c28b39332c40d4e1def80fee9e7b70588d0c592a))
* **slog-to-otel:** more `methargs` parsing ([42a9bc0](https://github.com/Agoric/agoric-sdk/commit/42a9bc08dfa66f4653253a9cfc104307b44c908c))
* **Swingset:** add crank details to slog event ([be1f443](https://github.com/Agoric/agoric-sdk/commit/be1f443bdfd49325316607142f116ca3153e296f))
* **telemetry:** cleanup slot-to-otel output ([97c695f](https://github.com/Agoric/agoric-sdk/commit/97c695f60fce031bf9307fe8237d3df756d2a4e1))
* **telemetry:** close store iterator on has check ([6199337](https://github.com/Agoric/agoric-sdk/commit/6199337d40e42ffb4057f5a653f9cecfb21afe3f))
* **telemetry:** COMMIT should exit the txn ([36bf35c](https://github.com/Agoric/agoric-sdk/commit/36bf35c4daef7a42456aee7d917eba597abeb887))
* **telemetry:** do not mutate the original slog object ([#5705](https://github.com/Agoric/agoric-sdk/issues/5705)) ([4018a28](https://github.com/Agoric/agoric-sdk/commit/4018a28fcc9ea3ecd28d09e54e5c7cd2d64907b6))
* **telemetry:** ingest script should not skip lines on time backtrack ([785a5c0](https://github.com/Agoric/agoric-sdk/commit/785a5c0974ad8ed62501ad6e02245dd77d7c7815))
* **telemetry:** Use transactions for tmp telemetry DB ([dea1a2a](https://github.com/Agoric/agoric-sdk/commit/dea1a2ac31586cf16216e57162ad2951f07dc178))

### [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.2.0...@agoric/telemetry@0.2.1) (2022-05-28)

### Bug Fixes

* **slog-to-otel:** ignore `vatstoreGetAfter` syscall ([7baed8e](https://github.com/Agoric/agoric-sdk/commit/7baed8ea1c7513d57bd33edb8c4b6a80dd5182ed))

## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/telemetry@0.1.1...@agoric/telemetry@0.2.0) (2022-04-18)

### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* **telemetry:** `echo 2022-02-18T12:00:00Z | ./ingest.sh f.slog` ([bede363](https://github.com/Agoric/agoric-sdk/commit/bede363018656bad32b6764a5216acaaf2ca19bc))
* **telemetry:** upgrade to latest `[@opentelemetry](https://github.com/opentelemetry)` ([de82224](https://github.com/Agoric/agoric-sdk/commit/de82224eb08a40e139f20e74d6f1038e50fbfa40))

### Bug Fixes

* **telemetry:** clean up scripts and leave pointers ([1830c55](https://github.com/Agoric/agoric-sdk/commit/1830c55edeb814b79f25f9fbacdbebbac7c2a26f))
* **telemetry:** count work duration per block, not between blocks ([b95a124](https://github.com/Agoric/agoric-sdk/commit/b95a124d17fca6edf04232f8e3a7eeef196e5b43))
* **telemetry:** ingest rate limiting ([fd164c8](https://github.com/Agoric/agoric-sdk/commit/fd164c82d56f416309071b85c60da1af34af7821))
* **telemetry:** rework Prometheus metrics ([38a1922](https://github.com/Agoric/agoric-sdk/commit/38a1922ce2c21e4f31b4a1bedd634bbe627990f9))

### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))

### 0.1.1 (2022-02-21)

### Features

* **telemetry:** `frcat` script to extract `flight-recorder.bin` ([7ee4091](https://github.com/Agoric/agoric-sdk/commit/7ee409102269ab41a1f3f5d5a0bdd29b6eb12a36))
* **telemetry:** add `@agoric/telemetry/src/flight-recorder.js` ([b02b0c8](https://github.com/Agoric/agoric-sdk/commit/b02b0c8086136d8e780b687ae65df41796946eec))
* **telemetry:** introduce for opentelemetry.io integration ([4e382dc](https://github.com/Agoric/agoric-sdk/commit/4e382dcede81717a4c9941266b0377ad531b8b38))
* **telemetry:** use `makeSlogSenderFromModule` ([2892da9](https://github.com/Agoric/agoric-sdk/commit/2892da96eff902c5f616424d6fb9946aaaef1b0f))

### Bug Fixes

* Remove extraneous eslint globals ([17087e4](https://github.com/Agoric/agoric-sdk/commit/17087e4605db7d3b30dfccf2434b2850b45e3408))
* **telemetry:** make flight recorder big-endian on all platforms ([bfe877e](https://github.com/Agoric/agoric-sdk/commit/bfe877e8825d551b9ea6f80e2623fb450883dab0))
