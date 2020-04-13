function makeEventualSendTransformer(parser, generate) {
  const transform = {
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
