export function makeExternalStoreTransformer(
  babelCore,
  {
    overrideParser = undefined,
    overrideExternalStoreModuleId = '@agoric/store',
    overrideMakeExternalStoreId = 'makeExternalStore',
    overrideMakeSystemExternalStoreId = 'makeSystemExternalStore',
  } = {},
) {
  const parser = overrideParser
    ? overrideParser.parse || overrideParser
    : babelCore.parseSync;
  const externalStoreModuleId = overrideExternalStoreModuleId;
  const makeExternalStoreId = overrideMakeExternalStoreId;
  const makeSystemExternalStoreId = overrideMakeSystemExternalStoreId;

  const externalStorePlugin = ({ types: t }) => {
    const importBindings = new WeakSet();
    /** @type {WeakMap<any, { init: any, data: any }>} */
    const makerBodiesToIdents = new WeakMap();

    const replaceMakerBody = path => {
      if (!makerBodiesToIdents.has(path.node.body)) {
        return;
      }

      const { init, data } = makerBodiesToIdents.get(path.node.body);

      if (path.node.body.type === 'BlockStatement') {
        throw path.buildCodeFrameError(
          `Unexpected maker body type ${path.node.body.type}`,
        );
      }

      // Indirect all the bindings via the data property.
      Object.values(path.scope.bindings).forEach(binding => {
        binding.referencePaths.forEach(p => p.replaceWith(t.MemberExpression(data, p.node)));
        binding.constantViolations.forEach(p => p.node.left = t.MemberExpression(data, p.node.left));
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
        if (path.node.callee.type !== 'Identifier') {
          return;
        }
        const calleeBinding = path.scope.getBinding(path.node.callee.name);
        if (!importBindings.has(calleeBinding)) {
          return;
        }
        if (path.node.arguments.length !== 2) {
          throw path.buildCodeFrameError(
            `Call to ${makeExternalStoreId} requires 2 arguments`,
          );
        }
        path.node.callee = t.Identifier(makeSystemExternalStoreId);

        const maker = path.node.arguments[1];
        if (
          maker.type !== 'ArrowFunctionExpression' &&
          maker.type !== 'FunctionExpression'
        ) {
          throw path.buildCodeFrameError(
            `Maker argument to ${makeExternalStoreId} must be a function expression, not ${maker.type}`,
          );
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
                `Unrecognized maker parameter type ${node.type}`,
              );
            }
          }
        };

        // Create an object expression from the parameter definitions.
        maker.params.forEach(expandProperties);
        const adaptArgumentsBody = t.ObjectExpression(properties);
        const adaptArguments = t.ArrowFunctionExpression(
          maker.params,
          adaptArgumentsBody,
        );

        const init = path.scope.generateUidIdentifier('init');
        const data = path.scope.generateUidIdentifier('data');

        makerBodiesToIdents.set(maker.body, { init, data });
        path.node.arguments = [path.node.arguments[0], adaptArguments, maker];
      },
    };
    return { visitor };
  };

  const externalStoreTransform = {
    rewrite(ss) {
      const { src: source } = ss;

      // Do the actual transform.
      const ast = parser(source);
      const output = babelCore.transformFromAstSync(ast, source, {
        generatorOpts: {
          retainLines: true,
        },
        plugins: [externalStorePlugin],
        ast: true,
        code: true,
      });

      const actualSource = output.code;
      return {
        ...ss,
        ast,
        src: actualSource,
      };
    },
  };

  return externalStoreTransform;
}
