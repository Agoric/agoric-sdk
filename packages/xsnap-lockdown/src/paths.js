// define these here, in one place, so both the builder and the
// client-facing API can see the same paths

export const bundlePaths = {
  lockdown: new URL('../dist/lockdown.bundle', import.meta.url).pathname,
  lockdownDebug: new URL('../dist/lockdown-debug.bundle', import.meta.url)
    .pathname,
};

export const entryPaths = {
  lockdown: new URL('../lib/ses-boot.js', import.meta.url).pathname,
  lockdownDebug: new URL('../lib/ses-boot-debug.js', import.meta.url).pathname,
};
