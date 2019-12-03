import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';
import makeEventualSendTransformer from '@agoric/transform-eventual-send';

export default function makeDefaultEvaluateOptions() {
  const shims = [];
  const transforms = [...makeEventualSendTransformer(parse, generate)];

  return { shims, transforms };
}
