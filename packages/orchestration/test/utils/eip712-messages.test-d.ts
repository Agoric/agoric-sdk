import { expectAssignable } from 'tsd';
import type {
  EIP712MessageSchema,
  OperationNames,
  WitnessTypeParam,
} from '../../src/utils/eip712-messages.ts';

// A witness primary type must remain a string even for an unresolved schema.
const checkWitnessName = <
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
>(
  param: WitnessTypeParam<S, T>,
) => {
  expectAssignable<string>(param.type);
};
void checkWitnessName;
