import test from 'ava';
import { execCmd, checkPodsRunning } from '../scripts/shell.ts';

test('Ensure multichain env is running or start it', async t => {
  try {
    const podsOk = await checkPodsRunning();

    if (!podsOk) {
      // Navigate to multichain-testing dir and start env
      await execCmd(`cd ../../multichain-testing && make clean setup start`);
      const retryPodsOk = await checkPodsRunning();
      t.true(retryPodsOk, 'Multichain pods failed to start after setup');
    } else {
      t.pass('Multichain pods are already running');
    }
  } catch (err) {
    t.fail(`Multichain setup failed: ${(err as Error).message}`);
  }
});

test('Ensure gov1 key exists in local agd', async t => {
  try {
    // Check if gov1 already exists
    const listKeysCmd = `agd keys list --keyring-backend test`;
    const keyList = await execCmd(listKeysCmd);

    if (keyList.includes('"name": "gov1"') || keyList.includes('name: gov1')) {
      t.pass('gov1 key already exists');
    } else {
      // Add gov1 with recovery phrase
      const mnemonic =
        'health riot cost kitten silly tube flash wrap festival portion imitate this make question host bitter puppy wait area glide soldier knee';
      const addKeyCmd = `agd keys add gov1 --keyring-backend test --recover`;

      const result = await execCmd(addKeyCmd, {
        input: mnemonic + '\n',
      });

      t.assert(
        result.includes('name: gov1'),
        'gov1 key was not added successfully',
      );
    }
  } catch (err) {
    t.fail(`Failed to ensure gov1 key: ${(err as Error).message}`);
  }
});

test('Fund gov1 account and verify balances on Agoric', async t => {
  const addr = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

  try {
    console.log('\n🔄 Initiating USDC IBC transfer from Noble → Agoric...');
    const usdcTransferCmd = [
      `kubectl exec -i noblelocal-genesis-0 -- nobled tx ibc-transfer transfer transfer channel-0`,
      `${addr}`,
      `10000000uusdc`,
      `--from test1`,
      `--keyring-backend test`,
      `--chain-id noblelocal`,
      `--fees 2000uusdc`,
      `--gas auto`,
      `--gas-adjustment 1.3`,
      `-y`,
    ].join(' ');

    const usdcResult = await execCmd(usdcTransferCmd);
    console.log('✅ USDC transfer command output:\n', usdcResult);
    t.assert(
      usdcResult.includes('code: 0') || usdcResult.includes('txhash'),
      'USDC transfer failed',
    );

    console.log('\n💸 Sending BLD + IST from Agoric genesis...');
    const bankSendCmd = [
      `kubectl exec -i agoriclocal-genesis-0 -- agd tx bank send`,
      `genesis`,
      `${addr}`,
      `500000000000ubld,500000000000uist`,
      `--keyring-backend=test`,
      `--chain-id=agoriclocal`,
      `--fees=2000ubld`,
      `--gas=auto`,
      `--gas-adjustment=1.3`,
      `-y`,
    ].join(' ');

    const bankResult = await execCmd(bankSendCmd);
    console.log('✅ BLD/IST bank send output:\n', bankResult);
    t.assert(
      bankResult.includes('code: 0') || bankResult.includes('txhash'),
      'Bank send failed',
    );

    console.log('\n⏳ Waiting for transactions to finalize...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('\n🔍 Querying balances from agoriclocal...');
    const queryCmd = `kubectl exec -i agoriclocal-genesis-0 -- agd query bank balances ${addr} --output json`;
    const queryOutput = await execCmd(queryCmd);
    console.log('✅ Raw balance query result:\n', queryOutput);

    const parsed = JSON.parse(queryOutput);
    const balances: Record<string, number> = {};
    for (const coin of parsed.balances) {
      balances[coin.denom] = parseInt(coin.amount, 10);
    }

    console.log('\n📊 Parsed balances:', balances);

    const hasUSDC = Object.keys(balances).some(
      denom => denom.startsWith('ibc/') && balances[denom] >= 10_000_000,
    );
    t.true(hasUSDC, 'USDC balance missing or too low');
    t.true((balances['ubld'] ?? 0) >= 500_000_000_000, 'BLD balance too low');
    t.true((balances['uist'] ?? 0) >= 500_000_000_000, 'IST balance too low');

    console.log('✅ Balance verification passed!\n');
  } catch (err) {
    console.error('❌ Error during fund and balance check:', err);
    t.fail(`Funding or balance verification failed: ${(err as Error).message}`);
  }
});

test('Deploy contracts, vote on proposal, and confirm registration in vstorage', async t => {
  try {
    console.log('\n🔨 Building contracts...');
    const buildOutput = await execCmd('yarn build');
    console.log('✅ Build output:\n', buildOutput);

    // 1. Deploy chain-info
    console.log('\n🚀 Deploying `chain-info`...');
    const deployChainInfoCmd = [
      `scripts/deploy-cli.ts src/chain-info.build.js`,
      `--net=local`,
      `--from=gov1`,
      `--net=local`,
      `peer=noblelocal:connection-0:channel-0:uusdc`,
    ].join(' ');

    const chainInfoOutput = await execCmd(deployChainInfoCmd);
    console.log('✅ chain-info deploy output:\n', chainInfoOutput);
    t.false(
      chainInfoOutput.toLowerCase().includes('error'),
      'Deployment of chain-info failed',
    );

    // 2. Deploy portfolio
    console.log('\n🚀 Deploying `portfolio`...');
    const deployPortfolioCmd = [
      `scripts/deploy-cli.ts src/portfolio.build.js`,
      `--net=local`,
      `--from=gov1`,
      `-- --keyring-backend test`,
    ].join(' ');

    const portfolioOutput = await execCmd(deployPortfolioCmd);
    console.log('✅ portfolio deploy output:\n', portfolioOutput);
    t.false(
      portfolioOutput.toLowerCase().includes('error'),
      'Deployment of portfolio failed',
    );

    // 3. Query latest proposal
    console.log('\n📜 Querying latest proposal...');
    const queryProposalCmd = `kubectl exec -i agoriclocal-genesis-0 -- agd query gov proposals --output json`;
    const proposalOutput = await execCmd(queryProposalCmd);
    const parsed = JSON.parse(proposalOutput);
    const latestProposal = parsed.proposals?.[parsed.proposals.length - 1];

    if (!latestProposal) {
      t.fail('No proposals found');
      return;
    }

    const proposalId = latestProposal.id;
    console.log(
      `🗳 Submitting YES vote on proposal #${proposalId} from genesis...`,
    );

    const voteCmd = [
      `kubectl exec -i agoriclocal-genesis-0 -- agd tx gov vote`,
      proposalId,
      `yes`,
      `--from genesis`,
      `--keyring-backend test`,
      `--chain-id agoriclocal`,
      `--fees 5000ubld`,
      `--gas auto`,
      `--gas-adjustment 1.3`,
      `-y`,
    ].join(' ');

    const voteOutput = await execCmd(voteCmd);
    console.log('✅ Vote output:\n', voteOutput);
    t.false(
      voteOutput.toLowerCase().includes('error'),
      'Vote transaction failed',
    );

    // 4. Wait for the vote to finalize & contracts to be registered
    console.log('\n⏳ Waiting before querying vstorage...');
    await new Promise(r => setTimeout(r, 7000));

    // 5. Query vstorage for published.agoricNames.instance
    console.log('\n🔍 Querying vstorage for published.agoricNames.instance...');
    const curlCmd = `curl -s http://localhost:1317/agoric/vstorage/data/published.agoricNames.instance`;
    const vstorageOutput = await execCmd(curlCmd);
    console.log('✅ vstorage raw output:\n', vstorageOutput);

    const containsYmax = vstorageOutput.includes('ymax0');
    t.true(containsYmax, '`ymax0` not found in published.agoricNames.instance');

    console.log(
      '\n🎯 Contract ymax0 successfully registered in agoricNames.instance',
    );
  } catch (err) {
    console.error('❌ Error during deploy → vote → vstorage check:', err);
    t.fail(`Test failed: ${(err as Error).message}`);
  }
});
