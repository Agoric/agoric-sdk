function makeBangTransformer(parser, generate) {
  const transform = {
    rewrite(ss) {
      // Parse with infixBang enabled, rewriting to
      // Promise.resolve(...).get/put/post/delete
      const parseFunc =
        (ss.sourceType === 'expression' && parser.parseExpression) || parser.parse;
      const ast = (parseFunc || parser)(ss.src, {
        plugins: ['infixBang'],
      });
      // Create the source from the ast.
      const output = generate(ast, {}, ss.src);
      // console.log(`have src`, output.code);
      return {
        ...ss,
        ast,
        src: output.code,
      };
    },
  };

  return [transform];
}

export default makeBangTransformer;
