import * as babelParser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generator from '@babel/generator';
import * as types from '@babel/types';

// Create a file structure to wire into @babel/traverse.
// Gleaned from @babel/core/lib/transformation/file/file.js
export function makePureFile({ code, ast }) {
  const file = {
    ast,
    opts: {},
    code,
  };
  file.hub = {
    file,
    getCode: () => file.code,
    getScope: () => file.scope,
    addHelper() {
      throw Error(`Helpers are not supported by the fake file hub.`);
    },
    buildError(_node, msg, Error = TypeError) {
      return new Error(msg);
    },
  };
  file.path = NodePath.get({
    hub: file.hub,
    parentPath: null,
    parent: file.ast,
    container: file.ast,
    key: 'program',
  }).setContext();
  file.scope = file.path.scope;
  return file;
}

/**
 * Create a working subset of babelCore that doesn't touch the filesystem.
 * Gleaned from @babel/core/lib/transformation/index.js
 */
export function makePureBabelCore() {
  return {
    parseSync(source, { parserOpts = undefined } = {}) {
      return babelParser.parse(source, parserOpts);
    },
    transformFromAstSync(ast, code = undefined, transformOptions = undefined) {
      const { generatorOpts, plugins } = transformOptions || {};

      const pluginArgs = [{ types }];
      const visitors = plugins
        .map(p => p(...pluginArgs).visitor)
        .filter(v => v);
      if (!visitors.length) {
        // We fail here because a null transform is unnecessary.
        throw Error(`No visitors found in plugins`);
      }
      const visitor = traverse.visitors.merge(visitors);
      const file = makePureFile({ ast, code });
      (traverse.default || traverse)(file.ast, visitor);
      return (generator.default || generator)(ast, generatorOpts, code);
    },
  };
}
