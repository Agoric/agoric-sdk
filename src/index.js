import maybeExtendPromise from '@agoric/eventual-send';

const EPromise = maybeExtendPromise(Promise);

// Attempt to patch the platform.
(typeof window === 'undefined' ? global : window).Promise = EPromise;

function makeBangTransformer(parse, generate) {
  const transform = {
    init(r) {
      r.global.Promise = r.evaluate(`(${maybeExtendPromise})`)(
        r.global.Promise,
      );
    },

    rewrite(rs) {
      // Parse with infixBang enabled, rewriting to
      // Promise.resolve(...).get/put/post/delete
      const ast = parse(rs.src, {
        plugins: ['infixBang'],
      });
      // Create the source from the ast.
      const output = generate(ast, {}, rs.src);
      // console.log(`have src`, output.code);
      return {
        ...rs,
        ast,
        src: output.code,
      };
    },
  };
  return [transform];
}

export default makeBangTransformer;
