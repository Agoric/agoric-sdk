function makeEventualSendTransformer(parser, generate) {
  let evaluateProgram;
  let myRequire;
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
