/**
 * ESLint rule: fetch-response-ok
 *
 * Require checking `response.ok` on awaited `fetch()` results before using other
 * properties or methods on the response object.
 *
 * @import {Rule} from 'eslint';
 */

const isFetchCall = node => {
  if (!node || node.type !== 'CallExpression') {
    return false;
  }

  const { callee } = node;
  return (
    (callee.type === 'Identifier' && callee.name === 'fetch') ||
    (callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'fetch')
  );
};

const isAwaitedFetchCall = node =>
  Boolean(
    node && node.type === 'AwaitExpression' && isFetchCall(node.argument),
  );

/** @type {Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require checking response.ok before using other members of awaited fetch() responses.',
      recommended: true,
    },
    schema: [],
    messages: {
      fetchResponseOk:
        'Check {{name}}.ok before using other fetch() response properties or methods.',
    },
  },

  create(context) {
    /** @type {Array<Map<string, { checkedOk: boolean }>>} */
    const scopeStack = [];

    const getTracked = name => {
      for (let index = scopeStack.length - 1; index >= 0; index -= 1) {
        const tracked = scopeStack[index].get(name);
        if (tracked) {
          return tracked;
        }
      }
      return undefined;
    };

    return {
      Program() {
        scopeStack.push(new Map());
      },
      'Program:exit': function programExit() {
        scopeStack.pop();
      },
      FunctionDeclaration() {
        scopeStack.push(new Map());
      },
      'FunctionDeclaration:exit': function functionDeclarationExit() {
        scopeStack.pop();
      },
      FunctionExpression() {
        scopeStack.push(new Map());
      },
      'FunctionExpression:exit': function functionExpressionExit() {
        scopeStack.pop();
      },
      ArrowFunctionExpression() {
        scopeStack.push(new Map());
      },
      'ArrowFunctionExpression:exit': function arrowFunctionExpressionExit() {
        scopeStack.pop();
      },

      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && isAwaitedFetchCall(node.init)) {
          scopeStack.at(-1)?.set(node.id.name, { checkedOk: false });
        }
      },

      MemberExpression(node) {
        if (
          node.object.type !== 'Identifier' ||
          node.property.type !== 'Identifier'
        ) {
          return;
        }

        const responseName = node.object.name;
        const propertyName = node.property.name;
        const tracked = getTracked(responseName);
        if (!tracked) {
          return;
        }

        if (propertyName === 'ok') {
          tracked.checkedOk = true;
          return;
        }

        if (!tracked.checkedOk) {
          context.report({
            node,
            messageId: 'fetchResponseOk',
            data: { name: responseName },
          });
        }
      },
    };
  },
};
