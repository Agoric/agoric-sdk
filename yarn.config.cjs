// see https://yarnpkg.com/features/constraints
const { defineConfig } = require('@yarnpkg/types');

module.exports = defineConfig({
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      if (workspace.cwd.startsWith('packages/')) {
        workspace.set('engines.node', '^20.9 || ^22.11');
        if (workspace.ident?.startsWith('@aglocal/')) {
          workspace.set('private', true);
        } else {
          workspace.unset('private');
        }
      } else if (workspace.cwd.startsWith('services/')) {
        workspace.set('private', true);
      }
    }
  },
});
