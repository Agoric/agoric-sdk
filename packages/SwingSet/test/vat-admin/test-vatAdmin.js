import { test } from 'tape';
import harden from '@agoric/harden';
import { buildVatAdmin } from '../../src/kernel/vatAdmin/vatAdmin';

let indirectVatCreationFn;
function vatCreationSetterFunction(fn) {
  indirectVatCreationFn = fn;
}

function createFakeVatCreationFunction() {
  let savedSrc;
  let savedId;

  return harden({
    fakeVatCreationFunction(src, id) {
      savedId = id;
      savedSrc = src;
    },
    getSavedSrc() {
      return savedSrc;
    },
    getSavedId() {
      return savedId;
    },
  });
}

test('VatAdmin outer vat connectivity', t => {
  const { endowments, registerVatCreationFunction } = buildVatAdmin();
  const fakeCreator = createFakeVatCreationFunction();
  endowments.registerVatCreationSetter(vatCreationSetterFunction);
  registerVatCreationFunction(fakeCreator.fakeVatCreationFunction);
  indirectVatCreationFn('some src', 38);
  t.equal('some src', fakeCreator.getSavedSrc());
  t.equal(38, fakeCreator.getSavedId());
  t.end();
});

test('VatAdmin outer vat order dependence', t => {
  const { registerVatCreationFunction } = buildVatAdmin();
  const fake = createFakeVatCreationFunction();
  t.throws(
    () => registerVatCreationFunction(fake.fakeVatCreationFunction),
    /must be set before this/,
  );
  t.end();
});
