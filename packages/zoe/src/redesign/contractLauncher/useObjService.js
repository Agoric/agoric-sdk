// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeScalarMap } from '@agoric/store';
import { makeIssuerKit, AssetKind } from '@agoric/ertp';

const { details: X } = assert;

const makeRevocableWrapper = obj => {
  // ??
  // Needs membrane?
  return wrappedObj;
};

const revoke = obj => {
  // ??
};

// scoped to each contract instance
const makeService = (instance, installation) => {
  const wrappedObjToID = makeScalarMap('wrappedObj');
  const idToDescription = makeScalarMap('id');
  const descriptions = new Set();
  const idToOriginal = makeScalarMap('id');

  const issuerKit = makeIssuerKit('invitation', AssetKind.SET);
  const { mint, issuer } = issuerKit;

  const makePayment = async (original, id, description) => {
    const info = await E(original).getInfo();
    const amount = {
      ...info,
      id,
      instance,
      installation,
      description,
    };
    return mint.mintPayment(amount);
  };

  const register = description => {
    const id = makeHandle('nft');
    assert(
      !descriptions.has(description),
      X`Description ${description} is already used`,
    );
    descriptions.add(description);
    idToDescription.init(id, description);
    return id;
  };

  const service = Far('service', {
    registerAndGetObj: async (originalObj, description) => {
      const id = register(description);
      const wrappedObj = makeRevocableWrapper(originalObj);
      wrappedObjToID.init(wrappedObj, id);
      return wrappedObj;
    },
    registerAndGetNFT: async (originalObj, description) => {
      const id = register(description);
      return makePayment(originalObj, id, description);
    },
    getObj: async payment => {
      const amount = await issuer.burn(payment);
      // TODO: Assert only one
      const [{ id }] = /** @type {SetValue} */ (amount.value);
      const original = idToOriginal.get(id);
      const wrappedObj = makeRevocableWrapper(original);
      wrappedObjToID.set(wrappedObj, id);
      return wrappedObj;
    },
    getPayment: async wrapperObj => {
      const id = wrappedObjToID.get(wrapperObj);
      const original = idToOriginal.get(id);
      revoke(wrapperObj);
      const description = idToDescription.get(id);
      return makePayment(original, id, description);
    },
  });

  return service;
};
harden(makeService);
