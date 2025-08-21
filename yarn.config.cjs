// see https://yarnpkg.com/features/constraints

module.exports = {
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      if (workspace.cwd.startsWith('packages/')) {
        workspace.set('engines.node', '^20.9 || ^22.11');
      }
    }
  },
};
