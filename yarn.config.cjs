// see https://yarnpkg.com/features/constraints
const { defineConfig } = require('@yarnpkg/types');

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      for (const version of workspace.pkg.dependencies.values()) {
        if (
          version.ident.startsWith('@aglocal/') ||
          version.ident.startsWith('@agoric/') ||
          version.ident == 'agoric'
        ) {
          // If the dependency is not a workspace and is not the special case '@agoric/wallet-ui',
          // then it's an error because all Agoric dependencies must be resolved via the workspace protocol.
          if (!version.workspace && version.ident != '@agoric/wallet-ui')
            workspace.error(
              'Agoric dependencies must resolve by the workspace: protocol',
            );
        }
      }
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
        if (!workspace.ident?.startsWith('@aglocal/')) {
          workspace.error(
            'Workspaces in the services directory must be in the @aglocal scope',
          );
        }
        workspace.set('private', true);
      }
    }
  },
});
