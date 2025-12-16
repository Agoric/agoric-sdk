/**
 * @file
 * @see {@link src/stubs/viem-abi.ts}
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/stubs/viem-abi.ts'],
  format: ['esm'],
  outDir: 'src/vendor/viem',
  target: 'es2020',
  clean: true,
  dts: true,
  bundle: true,
  splitting: false,
  platform: 'neutral',
  external: ['stream', 'crypto', 'http', 'https', 'zlib', 'net', 'tls', 'url', '@noble/hashes', '@noble/curves'],
});
