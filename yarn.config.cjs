// see https://yarnpkg.com/features/constraints
const { defineConfig } = require('@yarnpkg/types');

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      if (workspace.cwd.startsWith('packages/')) {
        workspace.set('engines.node', '^20.9 || ^22.11');
        if (workspace.ident?.startsWith('@aglocal/')) {
          workspace.set('private', true);
        } else if (
          workspace.ident?.startsWith('@agoric/') ||
          workspace.ident == 'agoric'
        ) {
          workspace.unset('private');
        } else {
          workspace.error(
            'Workspaces in the packages directory must be under the @agoric or @aglocal scope',
          );
        }
      } else if (workspace.cwd.startsWith('services/')) {
        if (!workspace.cwd.endsWith('-service')) {
          workspace.error(
            'Workspaces in the services directory must end with "-service"',
          );
        }
        workspace.set('private', true);
      }
    }
  },
});
