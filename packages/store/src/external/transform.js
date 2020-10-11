export function makeExternalStoreTransformer(
  babelCore,
  {
    overrideParser = undefined,
    overrideRequireStorePathSuffix = '/store/src/external/default.js',
    overrideExternalStoreModuleId = '@agoric/store',
    overrideMakeExternalStoreId = 'makeExternalStore',
    overrideMakeClosureExternalStoreId = 'makeClosureExternalStore',
  } = {},
) {
  const parser = overrideParser
    ? overrideParser.parse || overrideParser
    : babelCore.parseSync;
  const requireStorePathSuffix = overrideRequireStorePathSuffix;
  const externalStoreModuleId = overrideExternalStoreModuleId;
  const makeExternalStoreId = overrideMakeExternalStoreId;
  const makeClosureExternalStoreId = overrideMakeClosureExternalStoreId;

  const externalStorePlugin = ({ types: t }) => {
    const requireStoreBindings = new WeakSet();
    const importBindings = new WeakSet();
    /** @type {WeakMap<any, { init: any, data: any }>} */
    const makerBodiesToIdents = new WeakMap();

    const unimplemented = (path, msg) => {
      if (path) {
        const err = path.buildCodeFrameError(msg);
        msg = err.message;
      }
      console.warn(`Unimplemented ${makeExternalStoreId}: ${msg}`);
    };

    const replaceMakerBody = path => {
      if (!makerBodiesToIdents.has(path.node.body)) {
        return;
      }

      const { init, data } = makerBodiesToIdents.get(path.node.body);

      if (path.node.body.type === 'BlockStatement') {
        throw path.buildCodeFrameError(
          `Unexpected maker function body type ${path.node.body.type}`,
        );
      }

      // Indirect all the bindings via the data property.
      Object.values(path.scope.bindings).forEach(binding => {
        binding.referencePaths.forEach(p =>
          p.replaceWith(t.MemberExpression(data, p.node)),
        );
        binding.constantViolations.forEach(
          p => (p.node.left = t.MemberExpression(data, p.node.left)),
        );
      });

      // Create the makeHydrate function.
      const hydrate = t.ArrowFunctionExpression(
        [data],
        t.cloneDeep(path.node.body),
      ); // path.node.body);
      const makeHydrate = t.ArrowFunctionExpression([init], hydrate);
      path.replaceWith(makeHydrate);
    };

    const visitor = {
      ImportSpecifier(path) {
        // Look for the binding of: import { makeExternalStore as foo } from '@agoric/store';
        if (path.parent.source.value !== externalStoreModuleId) {
          return;
        }
        if (path.node.imported.name !== makeExternalStoreId) {
          return;
        }
        const binding = path.scope.getBinding(path.node.local.name);
        importBindings.add(binding);
      },
      ArrowFunctionExpression: {
        exit: replaceMakerBody,
      },
      FunctionExpression: {
        exit: replaceMakerBody,
      },
      CallExpression(path) {
        if (
          requireStorePathSuffix &&
          path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'require'
        ) {
          // All this cruft is to manage:
          // var _default = require('../store/src/external/default.js');
          const args = path.node.arguments;
          if (
            args.length === 1 &&
            args[0].type === 'StringLiteral' &&
            args[0].value.endsWith(requireStorePathSuffix)
          ) {
            if (path.parent.type === 'VariableDeclarator') {
              const binding = path.scope.getBinding(path.parent.id.name);
              requireStoreBindings.add(binding);
            }
            return;
          }
        }

        const callee = path.node.callee;
        switch (callee.type) {
          case 'Identifier': {
            const calleeBinding = path.scope.getBinding(callee.name);
            if (!importBindings.has(calleeBinding)) {
              return;
            }
            break;
          }
          case 'MemberExpression': {
            // Look for: _foo.makeExternalStore(...) where
            // _foo is require('.../store/src/external/default.js');
            if (
              callee.computed ||
              callee.object.type !== 'Identifier' ||
              callee.property.type !== 'Identifier'
            ) {
              return;
            }
            if (callee.property.name !== makeExternalStoreId) {
              return;
            }
            const calleeObjectBinding = path.scope.getBinding(
              callee.object.name,
            );
            if (!requireStoreBindings.has(calleeObjectBinding)) {
              return;
            }
            break;
          }
          default: {
            return;
          }
        }
        if (path.node.arguments.length !== 2) {
          unimplemented(
            path,
            `call to ${makeExternalStoreId} requires 2 arguments`,
          );
          return;
        }

        const maker = path.node.arguments[1];
        if (
          maker.type !== 'ArrowFunctionExpression' &&
          maker.type !== 'FunctionExpression'
        ) {
          unimplemented(
            path,
            `maker must be a function expression, not ${maker.type}`,
          );
          return;
        }

        if (maker.body.type === 'BlockStatement') {
          unimplemented(path, `maker function body must be an expression`);
          return;
        }

        const properties = [];
        const expandProperties = node => {
          switch (node.type) {
            case 'Identifier': {
              const id = t.Identifier(node.name);
              const prop = t.ObjectProperty(id, id);
              prop.shorthand = true;
              properties.push(prop);
              break;
            }

            case 'ObjectProperty': {
              const id = t.Identifier(node.value.name);
              const prop = t.ObjectProperty(id, id);
              prop.shorthand = true;
              properties.push(prop);
              break;
            }

            case 'ArrayPattern': {
              node.elements.forEach(expandProperties);
              break;
            }

            case 'ObjectPattern': {
              node.properties.forEach(expandProperties);
              break;
            }

            case 'RestElement': {
              expandProperties(node.argument);
              break;
            }

            case 'AssignmentPattern': {
              expandProperties(node.left);
              break;
            }

            default: {
              throw path.buildCodeFrameError(
                `Unimplemented; unrecognized maker parameter type ${node.type}`,
              );
            }
          }
        };

        // Create an object expression from the parameter definitions.
        try {
          maker.params.forEach(expandProperties);
        } catch (e) {
          unimplemented(null, e.message);
          return;
        }

        // We are ready to mutate the node.
        const adaptArgumentsBody = t.ObjectExpression(properties);
        const adaptArguments = t.ArrowFunctionExpression(
          maker.params,
          adaptArgumentsBody,
        );

        const init = path.scope.generateUidIdentifier('init');
        const data = path.scope.generateUidIdentifier('data');

        makerBodiesToIdents.set(maker.body, { init, data });
        path.node.callee = t.Identifier(makeClosureExternalStoreId);
        path.node.arguments = [path.node.arguments[0], adaptArguments, maker];
      },
    };
    return { visitor };
  };

  const externalStoreTransform = source => {
    // Do the actual transform.
    const ast = parser(source, { sourceType: 'module' });
    const output = babelCore.transformFromAstSync(ast, source, {
      generatorOpts: {
        retainLines: true,
        compact: false,
      },
      plugins: [externalStorePlugin],
      ast: true,
      code: true,
    });

    return output.code;
  };

  return externalStoreTransform;
}
