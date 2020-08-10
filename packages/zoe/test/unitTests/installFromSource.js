import bundleSource from '@agoric/bundle-source';

export const installationPFromSource = (zoe, source) =>
  bundleSource(source).then(b => zoe.install(b));
