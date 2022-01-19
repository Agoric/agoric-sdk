// @ts-check
/* global Buffer */

// https://stackoverflow.com/a/54565854/7963
/**
 *
 * @param {Promise<NodeJS.ReadStream>} streamP
 */
async function read(streamP) {
  const chunks = [];
  const stream = await streamP;
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * @param { string[] } args
 * @param { Object } io
 * @param { typeof import('fs/promises').readFile } io.readFile
 */
const main = async (args, { readFile }) => {
  const [fn] = args;
  if (!fn) throw Error('usage: authorityViz config.json');
  const txt = await readFile(fn, 'utf-8');
  const config = JSON.parse(txt);
  const {
    vats: {
      bootstrap: {
        parameters: { bootstrapManifest },
      },
    },
  } = config;

  console.log({ bootstrapManifest });
};

/* global process */
(async () => {
  const fsp = await import('fs/promises');
  return main(process.argv.slice(2), { readFile: fsp.readFile });
})().catch(console.error);
