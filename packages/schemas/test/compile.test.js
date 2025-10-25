import test from 'ava';
import { execFile } from 'node:child_process';
import { readFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { Far } from '@endo/far';
import { M, matches } from '@endo/patterns';
import { compileSchemasModule } from '../src/compile.js';

const here = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const TEST_TEMP_ROOT = join(process.cwd(), '.agoric-schemas-test');

const importFromSource = async source => {
  await mkdir(TEST_TEMP_ROOT, { recursive: true });
  const dir = await mkdtemp(join(TEST_TEMP_ROOT, 'module-'));
  const file = join(dir, 'module.mjs');
  await writeFile(file, source, 'utf8');
  try {
    return await import(`${pathToFileURL(file).href}?${Date.now()}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

test('compiles simple described schema', async t => {
  const source = `import { z } from 'zod';\nexport const FooSchema = z.string().describe('Greeting text');\n`;
  const compiled = await compileSchemasModule(source, {
    sourceModuleSpecifier: './foo.js',
  });

  t.true(compiled.js.includes('/**\n * Greeting text\n */'));
  t.true(compiled.js.includes('export const Foo = M.string();'));
  t.true(compiled.js.includes('harden(Foo);'));
  t.true(
    compiled.dts.includes(
      'export type Foo = z.infer<typeof source.FooSchema>;',
    ),
  );
  t.true(compiled.dts.includes('export declare const Foo: TypedPattern<Foo>;'));

  const mod = await importFromSource(compiled.js);
  t.deepEqual(mod.Foo, M.string());
});

test('transforms smart-wallet fixture schemas', async t => {
  const fixturePath = resolve(here, 'fixtures', 'smart-wallet.schemas.js');
  const source = await readFile(fixturePath, 'utf8');
  const compiled = await compileSchemasModule(source, {
    sourceModuleSpecifier: './smart-wallet.schemas.js',
    evaluateModuleSpecifier: pathToFileURL(fixturePath).href,
  });

  t.true(compiled.js.includes('M.remotable("InstanceHandle")'));
  t.true(
    compiled.js.includes('M.splitArray([M.string()], [M.arrayOf(M.any())])'),
  );
  t.true(
    compiled.js.includes(
      '  /**\n   * If present, save the result of this invocation with this key.\n   */\n  saveResult: M.splitRecord({',
    ),
  );

  const mod = await importFromSource(compiled.js);
  const {
    ResultPlan,
    AgoricContractInvitationSpec,
    ContractInvitationSpec,
    WalletBridgeMsg,
  } = mod;

  t.true(matches(harden({ name: 'plan' }), ResultPlan));
  t.false(matches(harden({ name: 3n }), ResultPlan));

  const callPipeSample = harden([
    harden(['method']),
    harden(['other', harden([1, 2])]),
  ]);
  t.true(
    matches(
      harden({
        source: 'agoricContract',
        instancePath: harden(['instance', 'invitation']),
        callPipe: callPipeSample,
      }),
      AgoricContractInvitationSpec,
    ),
  );
  t.false(
    matches(
      harden({
        source: 'agoricContract',
        instancePath: harden(['instance']),
        callPipe: harden([harden([1, 2])]),
      }),
      AgoricContractInvitationSpec,
    ),
  );

  const expectedContractPattern = M.splitRecord(
    {
      source: 'contract',
      instance: M.remotable('InstanceHandle'),
      publicInvitationMaker: M.string(),
    },
    { invitationArgs: M.arrayOf(M.any()) },
    {},
  );
  t.deepEqual(ContractInvitationSpec, expectedContractPattern);

  const walletAction = harden({
    type: 'WALLET_ACTION',
    action: 'provision',
    blockHeight: 99,
    blockTime: 1234,
    owner: 'addr1',
  });
  const walletSpend = harden({
    type: 'WALLET_SPEND_ACTION',
    spendAction: 'pay',
    blockHeight: 99,
    blockTime: 1234,
    owner: 'addr1',
  });
  t.true(matches(walletAction, WalletBridgeMsg));
  t.true(matches(walletSpend, WalletBridgeMsg));
  t.false(
    matches(
      harden({
        type: 'WALLET_SPEND_ACTION',
        spendAction: 42,
        blockHeight: 99,
        blockTime: 1234,
        owner: 'addr1',
      }),
      WalletBridgeMsg,
    ),
  );
});

test('transforms portfolio fixture schemas', async t => {
  const fixturePath = resolve(here, 'fixtures', 'portfolio.schemas.js');
  const source = await readFile(fixturePath, 'utf8');
  const compiled = await compileSchemasModule(source, {
    sourceModuleSpecifier: './portfolio.schemas.js',
    evaluateModuleSpecifier: pathToFileURL(fixturePath).href,
  });

  t.true(
    compiled.js.includes(
      'M.recordOf(M.or("USDN", "Aave_Avalanche", "Compound_Base"), M.nat())',
    ),
  );
  t.true(compiled.js.includes('M.gte(0n)') || compiled.js.includes('M.nat()'));

  const mod = await importFromSource(compiled.js);
  const {
    TargetAllocation,
    FlowDetail,
    FlowStatus,
    PortfolioStatus,
    PositionStatus,
  } = mod;

  const allocation = harden({ USDN: 100n, Aave_Avalanche: 0n });
  t.true(matches(allocation, TargetAllocation));
  t.false(matches(harden({ Unknown: 1n }), TargetAllocation));

  const withdrawDetail = harden({
    type: 'withdraw',
    amount: harden({ brand: Far('Brand', {}), value: 5n }),
  });
  t.true(matches(withdrawDetail, FlowDetail));

  t.true(
    matches(
      harden({ state: 'fail', step: 2, how: 'transfer', error: 'boom' }),
      FlowStatus,
    ),
  );
  t.false(matches(harden({ state: 'run', step: 'bad', how: 'x' }), FlowStatus));

  const portfolio = harden({
    positionKeys: harden(['USDN']),
    flowCount: 1,
    accountIdByChain: harden({ cosmoshub: 'addr1' }),
    policyVersion: 1,
    rebalanceCount: 0,
    flowsRunning: harden({ flow1: withdrawDetail }),
  });
  t.true(matches(portfolio, PortfolioStatus));

  const position = harden({
    protocol: 'Aave',
    accountId: 'acc',
    netTransfers: withdrawDetail.amount,
    totalIn: withdrawDetail.amount,
    totalOut: withdrawDetail.amount,
  });
  t.true(matches(position, PositionStatus));
});

test('cli emits compiled module and declaration', async t => {
  await mkdir(TEST_TEMP_ROOT, { recursive: true });
  const tmp = await mkdtemp(join(TEST_TEMP_ROOT, 'cli-'));
  const schemasDir = resolve(tmp, 'schemas');
  await mkdir(schemasDir, { recursive: true });
  const inputPath = resolve(schemasDir, 'input.schemas.js');
  await writeFile(
    inputPath,
    `import { z } from 'zod';\nexport const FooSchema = z.number().describe('Number foo');\n`,
    'utf8',
  );

  const cliPath = resolve(here, '..', 'bin', 'compile-schemas.js');
  await execFileAsync(process.execPath, [cliPath, schemasDir]);

  const codegenDir = resolve(schemasDir, 'codegen');
  const jsPath = resolve(codegenDir, 'input.patterns.js');
  const dtsPath = resolve(codegenDir, 'input.patterns.d.ts');
  const js = await readFile(jsPath, 'utf8');
  const dts = await readFile(dtsPath, 'utf8');

  t.true(js.includes('Generated from ../input.schemas.js by @agoric/schemas'));
  t.true(js.includes('export const Foo = M.number();'));
  t.true(js.includes('harden(Foo);'));
  t.true(js.includes('/**\n * Number foo\n */'));
  t.true(dts.includes('export type Foo = z.infer<typeof source.FooSchema>;'));
  t.true(dts.includes('export declare const Foo: TypedPattern<Foo>;'));

  await rm(tmp, { recursive: true, force: true });
});
