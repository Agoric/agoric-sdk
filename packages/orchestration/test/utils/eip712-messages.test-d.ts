import { expectType } from 'tsd';
import {
  makeEIP712MessageKit,
  type EIP712MessageSchema,
  type OperationNames,
  type WitnessData,
  type WitnessTypeParam,
} from '../../src/utils/eip712-messages.ts';

// Authoring must accept an unresolved generic schema and operation.
const checkWitnessName = <
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
>(
  schema: S,
  operation: T,
  data: WitnessData<S, T, 'input'>,
) => {
  const kit = makeEIP712MessageKit(schema);
  kit.getWitness(operation, data);
};
void checkWitnessName;

const schema = {
  domainName: 'Test',
  domainVersion: '1',
  operationTypes: { Observe: [] },
  subTypes: {},
} as const satisfies EIP712MessageSchema;
declare const param: WitnessTypeParam<typeof schema, 'Observe'>;
expectType<'TestV1Observe'>(param.type);
