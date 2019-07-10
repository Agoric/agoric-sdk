const { lineBreak, tokTypes: tt, TokenType } = require('acorn');

const tok = {
  bang: new TokenType('!'),
};

function plugin(options, Parser) {
  return class extends Parser {
    parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow) {
      if (
        lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) ||
        !this.type.prefix ||
        this.value !== '!'
      ) {
        return super.parseSubscript(
          base,
          startPos,
          startLoc,
          noCalls,
          maybeAsyncArrow,
        );
      }

      // No linebreak, so we may have an infix bang.
      this.next();
      const node = this.startNodeAt(startPos, startLoc);

      // Do RESOLVER_OBJECT.resolve(obj)
      const RESOLVER = 'resolve';
      let resolver = this.startNodeAtNode(node);
      resolver = this.createIdentifier(resolver, RESOLVER);

      const RESOLVER_OBJECT = options.resolverObject;

      let objectId = this.startNodeAtNode(node);
      objectId = this.createIdentifier(objectId, RESOLVER_OBJECT);

      // Create the member expression: RESOLVER_OBJECT.resolve
      const member = this.startNodeAtNode(node);
      member.object = objectId;
      member.property = resolver;
      member.computed = false;
      resolver = this.finishNode(member, 'MemberExpression');

      // Create the resolver function call.
      let resolved = this.startNodeAtNode(node);
      resolved.callee = resolver;
      resolved.arguments = [base];
      resolved = this.finishNode(resolved, 'CallExpression');

      let method;
      const args = [];
      let eatenParenL = false;
      if (this.eat(tt.bracketL)) {
        // x ! [i]...
        // The first argument is always the computed expression.
        args.push(this.parseExpression());
        this.expect(tt.bracketR);
      } else if (this.eat(tt.parenL)) {
        // x ! (y, z) := resolved.post(undefined, [y, z])
        // First argument is undefined.
        let undef = this.startNodeAtNode(node);
        undef = this.createIdentifier(undef, 'undefined');
        args.push(undef);
        eatenParenL = true;
      } else {
        // Simple case: x ! p...
        // First argument is stringified identifier.
        const property = this.parseIdentifier();
        let arg = this.startNodeAt(property.startPos, property.startLoc);
        arg.value = property.name;
        arg = this.finishNode(arg, 'Literal');
        args.push(arg);
      }

      if (eatenParenL || this.eat(tt.parenL)) {
        // x ! [i](y, z) := resolved.post(i, [y, z])
        // The rest of the arguments are in parens.
        method = 'post';
        let expr = this.startNode();
        expr.elements = this.parseCallExpressionArguments(tt.parenR, false);
        expr = this.finishNode(expr, 'ArrayExpression');
        args.push(expr);
      } else if (this.eat(tt.eq)) {
        method = 'put';
        args.push(this.parseMaybeAssign());
      } else {
        // x ! [i] := resolved.get(i)
        // Method may change to resolved.delete(i)
        method = 'get';
      }

      let callee = this.startNodeAtNode(node);
      callee.object = resolved;
      callee.property = this.createIdentifier(
        this.startNodeAtNode(node),
        method,
      );
      callee.computed = false;
      callee = this.finishNode(callee, 'MemberExpression');

      // Create an InfixBang CallExpression.
      const ibang = this.startNodeAt(node.startPos, node.startLoc);
      if (method === 'get') {
        ibang.maybeDeleteInfixBang = true;
      }
      ibang.callee = callee;
      ibang.arguments = args;
      return this.finishNode(ibang, 'CallExpression');
    }

    parseMaybeUnary(refDestructuringErrors, sawUnary) {
      const node = super.parseMaybeUnary(refDestructuringErrors, sawUnary);
      if (node.operator === 'delete' && node.argument.maybeDeleteInfixBang) {
        const arg = node.argument;
        delete arg.maybeDeleteInfixBang;
        let deleteId = this.startNodeAtNode(node);
        deleteId = this.createIdentifier(deleteId, 'delete');
        arg.callee.property = deleteId;
        return arg;
      }
      return node;
    }

    // Helper functions from Babel...
    startNodeAtNode(node) {
      return this.startNodeAt(node.startPos, node.startLoc);
    }

    createIdentifier(node, ident) {
      node.name = ident;
      return this.finishNode(node, 'Identifier');
    }

    parseIdentifier() {
      return this.parseIdent(true);
    }
  };
}

module.exports = function curryOptions(options) {
  options = options || {};
  return function extendParser(Parser) {
    return plugin(
      {
        resolverObject: options.resolverObject || 'Promise',
      },
      Parser,
    );
  };
};
module.exports.tokTypes = tok;
