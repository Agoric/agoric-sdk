import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';
import makeEventualSendTransformer from '@agoric/transform-eventual-send';
import { makeHandledPromise } from '@agoric/eventual-send';

const shims = [`this.HandledPromise = (${makeHandledPromise})(Promise)`];
const transforms = [...makeEventualSendTransformer(parse, generate)];

export default function makeDefaultEvaluateOptions() {
  return { shims, transforms };
}
