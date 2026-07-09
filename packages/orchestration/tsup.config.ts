/**
 * @file
 * @see {@link src/stubs/viem-abi.ts}
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/stubs/viem-abi.ts',
    'src/stubs/viem-typedData.ts',
    'src/stubs/viem-address.ts',
  ],
  format: ['esm'],
  outDir: 'src/vendor/viem',
  target: 'es2020',
  tsconfig: 'tsconfig.tsup.build.json',
  clean: true,
  dts: true,
  bundle: true,
  platform: 'neutral',
  external: [
    'stream',
    'crypto',
    'http',
    'https',
    'zlib',
    'net',
    'tls',
    'url',
    '@noble/hashes',
    '@noble/curves',
  ],
});
