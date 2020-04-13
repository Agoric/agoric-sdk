import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';
import makeEventualSendTransformer from '@agoric/transform-eventual-send';
import SES1HandledPromiseShim from '@agoric/eventual-send/src/ses1';

export default function makeDefaultEvaluateOptions() {
  const shims = [SES1HandledPromiseShim];
  const transforms = [...makeEventualSendTransformer(parse, generate)];

  return { shims, transforms };
}
