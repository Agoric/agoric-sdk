import { decodeAbiParameters, decodeFunctionData } from 'viem';
import { depositFactoryCreateAndDepositInputs } from '../src/utils/evm-orch-factory.ts';

export const decodeFunctionCall = (
  memo: string,
  functionSignatures: string[],
) => {
  const parsedMemo = JSON.parse(memo);
  const decodedPayload = decodeAbiParameters(
    [
      {
        type: 'tuple',
        name: 'callMessage',
        components: [
          { name: 'id', type: 'string' },
          {
            name: 'calls',
            type: 'tuple[]',
            components: [
              { name: 'target', type: 'address' },
              { name: 'data', type: 'bytes' },
            ],
          },
        ],
      },
    ],
    `0x${Buffer.from(parsedMemo.payload, 'base64').toString('hex')}`,
  );
  const { id, calls } = decodedPayload[0];
  assert(
    calls.length === functionSignatures.length,
    'Decoded payload length does not match function signatures length',
  );
  const pairedCalls = calls.map((call, index) => ({
    functionSignature: functionSignatures[index],
    call,
  }));

  const decodedCalls = pairedCalls.map(({ functionSignature, call }) => {
    const { data } = call;
    const [name, paramsRaw] = functionSignature.split('(');
    const params = paramsRaw.replace(')', '').split(',').filter(Boolean);
    return decodeFunctionData({
      abi: [
        {
          type: 'function',
          name,
          inputs: params.map((type, i) => ({ type, name: `arg${i}` })),
        },
      ],
      data,
    });
  });

  return { id, calls: decodedCalls };
};

export const decodeCreateAndDepositPayload = (memo: string) => {
  const parsedMemo = JSON.parse(memo);
  const payloadBytes =
    typeof parsedMemo.payload === 'string'
      ? Buffer.from(parsedMemo.payload, 'base64')
      : Buffer.from(parsedMemo.payload);
  const decodedPayload = decodeAbiParameters(
    depositFactoryCreateAndDepositInputs,
    `0x${payloadBytes.toString('hex')}`,
  );
  return decodedPayload[0];
};
