import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';
import makeBangTransformer from '@agoric/transform-bang';
import maybeExtendPromise from '@agoric/eventual-send';

const shims = [`(${maybeExtendPromise})(Promise)`];
const transforms = [...makeBangTransformer(parse, generate)];

export default function makeDefaultEvaluateOptions() {
  return { shims, transforms };
}
