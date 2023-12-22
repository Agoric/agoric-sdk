// @ts-check
import process from 'node:process';

import { getPluginConfiguration } from '@yarnpkg/cli';
import { Configuration, Project } from '@yarnpkg/core';

const pluginConf = getPluginConfiguration();

/**
 * Omits the root
 *
 * @returns {Promise<Array<{ location: string, name: string }>>} e.g. {"location":"packages/zoe","name":"@agoric/zoe"}
 */
export const listWorkspaces = async () => {
  const cwd = process.cwd();
  const configuration = await Configuration.find(
    // @ts-expect-error not a PortablePath
    cwd,
    pluginConf,
  );
  const { project } = await Project.find(
    configuration,
    configuration.startingCwd,
  );
  const { workspacesByIdent } = project;
  const records = [];
  for (const entry of workspacesByIdent.entries()) {
    const [_, workspace] = entry;
    const { locator, relativeCwd } = workspace;
    // omit root
    if (relativeCwd === '.') {
      continue;
    }
    records.push({
      location: relativeCwd,
      name: locator.scope ? `@${locator.scope}/${locator.name}` : locator.name,
    });
  }
  return records;
};
