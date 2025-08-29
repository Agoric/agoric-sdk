import { decodeAbiParameters, decodeFunctionData } from 'viem';

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
