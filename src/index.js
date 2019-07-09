import makeEPromiseClass from '@agoric/eventual-send';

import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';

function makeBangTransformer() {
  let EPromise;
  const transform = {
    init(r, harden) {
      // Create a new EPromise from the platform Promise implementation.
      EPromise = harden(r.evaluate(`(${makeEPromiseClass})`)(r.global.Promise));
    },

    endow(es) {
      if (!EPromise) {
        // Not yet initialized: don't override platform Promises.
        return es;
      }
      // Override the global Promise reference.
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
