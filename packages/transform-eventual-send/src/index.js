export function makeTransform(parser, generate) {
  function transform(source) {
    // Parse with eventualSend enabled, rewriting to
    // HandledPromise.get/applyFunction/applyMethod(...). Whoever finally
    // evaluates this code must provide a HandledPromise object, probably as
    // an endowment.
    const parseFunc = parser.parse;
    const ast = (parseFunc || parser)(source, {
      sourceType: 'module',
      plugins: ['eventualSend', 'bigInt'],
    });
    // Create the source from the ast.
    const output = generate(ast, { retainLines: true }, source);
    return output.code;
  }
  return transform;
}
