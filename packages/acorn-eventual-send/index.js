/* global module */
const tilde = '~'.charCodeAt(0);
const dot = '.'.charCodeAt(0);
const zero = '0'.charCodeAt(0);
const nine = '9'.charCodeAt(0);

function makeCurryOptions(acorn, allOptions = {}) {
  const { tokTypes: tt, TokenType } = acorn;

  const tok = {
    tildeDot: new TokenType('~.'),
  };

  function plugin(options, Parser) {
    return class extends Parser {
      // eslint-disable-next-line camelcase
      readToken_tilde() {
        const next1 = this.input.charCodeAt(this.start + 1);
        const next2 = this.input.charCodeAt(this.start + 2);
        if (next1 === dot && !(next2 >= zero && next2 <= nine)) {
          this.pos += 2;
          return this.finishToken(tok.tildeDot);
        }
        return this.finishOp(tt.prefix, 1);
      }

      getTokenFromCode(code) {
        if (code === tilde) {
          return this.readToken_tilde();
        }
        return super.getTokenFromCode(code);
      }

      parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow) {
        if (!this.eat(tok.tildeDot)) {
          return super.parseSubscript(
            base,
            startPos,
            startLoc,
            noCalls,
            maybeAsyncArrow,
          );
        }

        const HANDLED_PROMISE = options.HandledPromise;
        const node = this.startNodeAt(startPos, startLoc);

        // Do HandledPromise.METHOD(BASE, ...)
        let method;
        const args = [base];
        let eatenParenL = false;
        if (this.eat(tt.bracketL)) {
          // x ~. [i]...
          // The second argument is always the computed expression.
          args.push(this.parseExpression());
          this.expect(tt.bracketR);
        } else if (this.eat(tt.parenL)) {
          // x ~. (y, z) := HandledPromise.applyFunction(base, [y, z])
          // No argument other than base.
          eatenParenL = true;
        } else {
          // Simple case: x ~. p...
          // Second argument is stringified identifier.
          const property = this.parseIdentifier();
          let arg = this.startNodeAtNode(property);
          arg.value = property.name;
          arg = this.finishNode(arg, 'Literal');
          args.push(arg);
        }
        if (eatenParenL || this.eat(tt.parenL)) {
          // x ~. [i](y, z) := HandledPromise.applyMethod(base, i, [y, z])
          // x ~. (y, z) := HandledPromise.applyFunction(base, [y, z]);
          method = eatenParenL ? 'applyFunction' : 'applyMethod';
          // The rest of the arguments are in parens.
          let expr = this.startNode();
          expr.elements = this.parseCallExpressionArguments(tt.parenR, false);
          expr = this.finishNode(expr, 'ArrayExpression');
          args.push(expr);
        } else if (this.eat(tt.eq)) {
          // x ~. [i] = foo := HandledPromise.set(base, i)
          method = 'set';
          args.push(this.parseMaybeAssign());
        } else {
          // x ~. [i] := HandledPromise.get(base, i)
          // Method may change to HandledPromise.delete(base, i)
          method = 'get';
        }

        let callee = this.startNodeAtNode(node);
        callee.object = this.createIdentifier(
          this.startNodeAtNode(node),
          HANDLED_PROMISE,
        );
        callee.property = this.createIdentifier(
          this.startNodeAtNode(node),
          method,
        );
        callee.computed = false;
        callee = this.finishNode(callee, 'MemberExpression');

        // Create a WavyDot CallExpression.
        const wdot = this.startNodeAtNode(node);
        if (method === 'get') {
          wdot.maybeDeleteWavyDot = true;
        }
        wdot.callee = callee;
        wdot.arguments = args;
        return this.finishNode(wdot, 'CallExpression');
      }

      parseMaybeUnary(refDestructuringErrors, sawUnary) {
        const node = super.parseMaybeUnary(refDestructuringErrors, sawUnary);
        if (node.operator === 'delete' && node.argument.maybeDeleteWavyDot) {
          const arg = node.argument;
          delete arg.maybeDeleteWavyDot;
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

      parseCallExpressionArguments(endToken, bool) {
        return this.parseExprList(endToken, true, bool);
      }
    };
  }

  return function extendParser(Parser) {
    return plugin(
      {
        HandledPromise: allOptions.HandledPromise || 'HandledPromise',
      },
      Parser,
    );
  };
}

module.exports = makeCurryOptions;
