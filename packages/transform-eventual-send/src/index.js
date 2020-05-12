import eventualSendBundle from './bundles/eventual-send';

export function makeTransform(parser, generate) {
  function transform(source) {
    // Parse with eventualSend enabled, rewriting to
    // HandledPromise.get/applyFunction/applyMethod(...). Whoever finally
    // evaluates this code must provide a HandledPromise object, probably as
    // an endowment.
    const parseFunc = parser.parse;
    const ast = (parseFunc || parser)(source, {
      sourceType: 'module',
      plugins: ['eventualSend'],
    });
    // Create the source from the ast.
    const output = generate(ast, { retainLines: true }, source);
    return output.code;
  }
  return transform;
}

// this transformer is meant for the SES1 evaluation format, with mutable
// endowments and stuff

function makeEventualSendTransformer(parser, generate) {
  const transformer = makeTransform(parser, generate);
  let HandledPromise;
  let evaluateProgram;
  let myRequire;
  let recursive = false;
  const transform = {
    closeOverSES(s) {
      // FIXME: This will go away when we can bundle an @agoric/harden that understands SES.
      myRequire = name => {
        if (name === '@agoric/harden') {
          return s.global.SES.harden;
        }
        throw Error(`Unrecognized require ${name}`);
      };
      // FIXME: This should be replaced with ss.evaluateProgram support in SES.
      evaluateProgram = (src, endowments = {}) => s.evaluate(src, endowments);
    },
    rewrite(ss) {
      const source = ss.src;
      const endowments = ss.endowments || {};
      if (!recursive && !('HandledPromise' in endowments)) {
        // Use a getter to postpone initialization.
        Object.defineProperty(endowments, 'HandledPromise', {
          get() {
            if (!HandledPromise) {
              // Get a HandledPromise endowment for the evaluator.
              // It will be hardened in the evaluator's context.
              const nestedEvaluate = src =>
                (evaluateProgram || ss.evaluateProgram)(src, {
                  require: myRequire || require,
                  nestedEvaluate,
                });
              const {
                source: evSendSrc,
                moduleFormat,
                sourceMap,
              } = eventualSendBundle;
              if (
                moduleFormat === 'getExport' ||
                moduleFormat === 'nestedEvaluate'
              ) {
                recursive = true;
                try {
                  const ns = nestedEvaluate(`(${evSendSrc}\n${sourceMap})`)();
                  HandledPromise = ns.HandledPromise;
                } finally {
                  recursive = false;
                }
              } else {
                throw Error(`Unrecognized moduleFormat ${moduleFormat}`);
              }
            }
            return HandledPromise;
          },
        });
      }

      const maybeSource = transformer(source);

      // Work around Babel appending semicolons.
      const actualSource =
        ss.sourceType === 'expression' &&
        maybeSource.endsWith(';') &&
        !source.endsWith(';')
          ? maybeSource.slice(0, -1)
          : maybeSource;

      return {
        ...ss,
        endowments,
        src: actualSource,
      };
    },
  };

  return [transform];
}

export default makeEventualSendTransformer;
