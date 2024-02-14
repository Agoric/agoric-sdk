import { bench } from '../src/benchmarkerator.js';

const setupData = {
  vaults: [],
  price: { starting: 12.34 },
};

const liquidationOptions = {
  collateralBrandKey: 'ATOM',
  managerIndex: 0,
};

const setup = async context => {
  const { collateralBrandKey, managerIndex } = liquidationOptions;
  const { setupVaults } = context.tools;

  await setupVaults(
    collateralBrandKey,
    managerIndex,
    setupData,
    setupData.vaults.length,
  );

  return {};
};

const executeRound = async (context, round) => {
  const { collateralBrandKey } = liquidationOptions;
  const { priceFeedDrivers } = context.tools;

  console.log(`price feed round #${round}`);
  await priceFeedDrivers[collateralBrandKey].setPrice(9.99);
};

bench.addBenchmark('price feed without liquidation', {
  setup,
  executeRound,
});

await bench.run();
