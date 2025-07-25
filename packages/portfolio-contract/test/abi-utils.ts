import { decodeAbiParameters, decodeFunctionData } from 'viem';

export const decodeFunctionCall = (
  memo: string,
  functionSignatures: string[],
) => {
  const parsedMemo = JSON.parse(memo);
  const decodedPayload = decodeAbiParameters(
    [
      {
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    `0x${Buffer.from(parsedMemo.payload, 'base64').toString('hex')}`,
  );

  assert(
    decodedPayload[0].length === functionSignatures.length,
    'Decoded payload length does not match function signatures length',
  );
  const pairedCalls = decodedPayload[0].map((call, index) => ({
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

  return decodedCalls;
};
