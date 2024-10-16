// @ts-check
import { Far } from '@endo/far'

const assertion = label => (arg, keyname) => assert(label, arg, keyname);

const startupAssertion = (arg, keyName) =>
    assertion(`Contract has been started without required property: ${keyName}.`)(
        arg,
    );

const makeCancelTokenMaker = name => {
    let tokenCount = 1;

    return () => Far(`cancelToken-${name}-${(tokenCount += 1)}`, {});
};
const handleFirstIncarnation = (baggage, key) =>
  !baggage.has(key)
    ? baggage.init(key, 1)
    : baggage.set(key, baggage.get(key) + 1);

export {
    assertion,
    handleFirstIncarnation,
    makeCancelTokenMaker,
    startupAssertion
}