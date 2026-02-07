# vm-config dependency audit

Direct package.json deps on @agoric/vm-config:
- @aglocal/boot (dependencies: workspace:*) in packages/boot/package.json

Textual @agoric/vm-config/<file> references outside packages/vm-config:
- packages/boot/tools/supports.ts:432:    configSpecifier = '@agoric/vm-config/decentral-itest-vaults-config.json',
- packages/boot/tools/authorityViz.js:240:  specifier || Fail`Usage: $0 @agoric/vm-config/decentral-...json`;
- packages/boot/test/orchestration/restart-contracts.test.ts:67:    '@agoric/vm-config/decentral-itest-orchestration-config.json',
- packages/boot/test/orchestration/axelar-gmp.test.ts:42:    '@agoric/vm-config/decentral-itest-orchestration-config.json',
- packages/boot/test/orchestration/orchestration.test.ts:51:    '@agoric/vm-config/decentral-itest-orchestration-config.json',
- packages/boot/test/orchestration/lca.test.ts:19:    '@agoric/vm-config/decentral-itest-orchestration-config.json',
- packages/boot/test/orchestration/contract-upgrade.test.ts:19:    '@agoric/vm-config/decentral-itest-orchestration-config.json',
- packages/boot/test/orchestration/vstorage-chain-info.test.ts:41:    '@agoric/vm-config/decentral-itest-orchestration-chains-config.json',
- packages/boot/test/bootstrapTests/walletFactory.ts:14:  configSpecifier = '@agoric/vm-config/decentral-main-vaults-config.json',
- packages/boot/test/bootstrapTests/net-ibc-upgrade.test.ts:19:const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';
- packages/boot/test/bootstrapTests/ec-membership-update.test.ts:47:    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
- packages/boot/test/bootstrapTests/terminate-governed.test.ts:7:const PLATFORM_CONFIG = '@agoric/vm-config/decentral-main-vaults-config.json';
- packages/boot/test/bootstrapTests/vtransfer.test.ts:15:    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
- packages/boot/test/bootstrapTests/vow-offer-results.test.ts:14:    '@agoric/vm-config/decentral-itest-orchestration-config.json',
- packages/boot/test/bootstrapTests/vats-restart.test.ts:14:const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';
- packages/boot/test/bootstrapTests/demo-config.test.ts:13:    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
- packages/boot/test/bootstrapTests/upgradeAPI.test.ts:109:const PLATFORM_CONFIG = '@agoric/vm-config/decentral-main-vaults-config.json';
- packages/boot/test/configs.test.js:21:  new URL(importMetaResolve(`@agoric/vm-config/${configName}`, import.meta.url))
- packages/boot/test/configs.test.js:192:  const cmd = runViz(['@agoric/vm-config/decentral-itest-vaults-config.json']);
