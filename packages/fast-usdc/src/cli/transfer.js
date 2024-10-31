import { readFile } from 'fs';

const transfer = (
  /** @type {import("fs").PathOrFileDescriptor} */ configPath,
  /** @type {string} */ amount,
  /** @type {string} */ destination,
) => {
  const start = Date.now();

  const execute = (/** @type {any} */ _config) => {
    console.error(
      `TODO actually kick off USDC transfer. Amount: ${amount}uusdc Destination: ${destination}`,
    );
    // TODO: Implement transfer logic
    // 1. Look up agoric Fast USDC contract address
    // 2. Append destination address to agoric address
    // 4. Register noble forwarding address for agoric address
    // 5. Sign and broadcast CCTP transfer to noble forwarding address
    console.info(`Finished in ${Date.now() - start}ms`);
  };

  readFile(configPath, 'utf-8', async (error, data) => {
    if (error) {
      console.error(
        `No config found at ${configPath}. Use "config init" to create one, or "--home" to specify config location.`,
      );
      return;
    }
    execute(JSON.parse(data));
  });
};

export default { transfer };
