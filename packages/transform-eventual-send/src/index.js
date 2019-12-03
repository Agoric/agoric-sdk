import eventualSendBundle from './bundles/eventual-send';

function makeEventualSendTransformer(parser, generate) {
  let HandledPromise;
  let evaluateProgram;
  const transform = {
    closeOverSES(s) {
      // FIXME: This should be replaced with ss.evaluateProgram support in SES.
      evaluateProgram = src => s.evaluate(src);
    },
    rewrite(ss) {
      const source = ss.src;
      if (!source.includes(`${'~'}.`)) {
        // Short circuit: no instance of tildot.
        return ss;
      }
      const endowments = ss.endowments || {};
      if (!('HandledPromise' in endowments)) {
        // Use a getter to postpone initialization.
        Object.defineProperty(endowments, 'HandledPromise', {
          get() {
            if (!HandledPromise) {
              // Get a HandledPromise endowment for the evaluator.
              // It will be hardened in the evaluator's context.
              const { source, moduleFormat } = eventualSendBundle;
              if (moduleFormat === 'getExport') {
                const ns = (evaluateProgram || ss.evaluateProgram)(`(${source})()`);
                HandledPromise = ns.HandledPromise;
              } else {
                throw Error(`Unrecognized moduleFormat ${moduleFormat}`);
              }
            }
            return HandledPromise;
          },
        });
      }

      // Parse with eventualSend enabled, rewriting to
      // HandledPromise.get/applyFunction/applyMethod(...)
      const parseFunc = parser.parse;
      const ast = (parseFunc || parser)(source, {
        plugins: ['eventualSend'],
      });
      // Create the source from the ast.
      const output = generate(ast, {}, source);

      // Work around Babel appending semicolons.
      const maybeSource = output.code;
      const actualSource =
        ss.sourceType === 'expression' &&
        maybeSource.endsWith(';') &&
        !source.endsWith(';')
          ? maybeSource.slice(0, -1)
          : maybeSource;

      return {
        ...ss,
        ast,
        endowments,
        src: actualSource,
      };
    },
  };

  return [transform];
}

export default makeEventualSendTransformer;
