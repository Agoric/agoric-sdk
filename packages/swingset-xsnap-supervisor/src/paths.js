// define these here, in one place, so both the builder and the
// client-facing API can see the same paths

export const bundlePaths = {
  supervisor: new URL('../dist/supervisor.bundle', import.meta.url).pathname,
};

export const hashPaths = {
  supervisor: new URL('../dist/supervisor.bundle.sha256', import.meta.url)
    .pathname,
};

export const entryPaths = {
  supervisor: new URL('../lib/entry.js', import.meta.url).pathname,
};
