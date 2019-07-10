import maybeExtendPromise from '@agoric/eventual-send';

const EPromise = maybeExtendPromise(Promise);

// Attempt to patch the platform.
(typeof window === 'undefined' ? global : window).Promise = EPromise;

function makeBangTransformer(parse, generate) {
  const transform = {
    endow(es) {
      return {
        ...es,
        endowments: { ...es.endowments, Promise: EPromise },
      };
    },

    rewrite(rs) {
      // Parse with infixBang enabled, rewriting to
      // Promise.resolve(...).get/put/post/delete
      const babelAst = parse(rs.src, {
        plugins: ['infixBang'],
      });
      // Create the source from the ast.
      const output = generate(babelAst, {}, rs.src);
      // console.log(`have src`, output.code);
      return {
        ...rs,
        babelAst,
        src: output.code,
      };
    },
  };
  return [transform];
}

export default makeBangTransformer;
