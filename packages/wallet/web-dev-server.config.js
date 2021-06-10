import process from 'process';

// Enable performance.now() and true SharedArrayBuffers.
const enableCrossOriginIsolated = prefix => async (ctx, next) => {
  if (ctx.path.startsWith(prefix)) {
    ctx.set('Cross-Origin-Embedder-Policy', 'require-corp');
    ctx.set('Cross-Origin-Opener-Policy', 'same-origin');
    ctx.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
  await next();
};

export default {
  open: true,
  watch: true,
  rootDir: 'public/',
  nodeResolve: {
    exportConditions: ['development'],
    jail: `${process.cwd()}/../../`,
    // dedupe: true,
  },
  middleware: [enableCrossOriginIsolated('/web-solo/')],
  // esbuildTarget: 'auto',
};
