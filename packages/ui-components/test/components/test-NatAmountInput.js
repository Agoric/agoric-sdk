// @ts-check

import '@endo/init';
import React from 'react';
import { TextField } from '@material-ui/core';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as enzyme from 'enzyme';

// @ts-ignore path is correct for compiled output
import { makeNatAmountInput } from '../../../dist/index.js'; // eslint-disable-line import/no-unresolved

const { shallow, render } = enzyme.default || enzyme;

const NatAmountInput = makeNatAmountInput({ React, TextField });

const makeShallowNatAmountInput = ({
  label = 'myLabel',
  onChange = () => {},
  value = 0n,
  decimalPlaces = 0,
  placesToShow = 0,
  disabled = false,
  error = false,
} = {}) => {
  return shallow(
    <NatAmountInput
      label={label}
      onChange={onChange}
      value={value}
      decimalPlaces={decimalPlaces}
      placesToShow={placesToShow}
      disabled={disabled}
      error={error}
    />,
  );
};

const renderNatAmountInput = ({
  label = 'myLabel',
  onChange = () => {},
  value = 0n,
  decimalPlaces = 0,
  placesToShow = 0,
  disabled = false,
  error = false,
} = {}) => {
  const result = render(
    <NatAmountInput
      label={label}
      onChange={onChange}
      value={value}
      decimalPlaces={decimalPlaces}
      placesToShow={placesToShow}
      disabled={disabled}
      error={error}
    />,
  );
  return result;
};

test('has props', t => {
  const wrapper = makeShallowNatAmountInput();
  t.is(wrapper.prop('label'), 'myLabel');
  t.is(wrapper.prop('type'), 'number');
  t.is(wrapper.prop('variant'), 'outlined');
  t.is(wrapper.prop('disabled'), false);
  t.is(wrapper.prop('error'), false);
  t.is(wrapper.prop('value'), '0');
  t.deepEqual(wrapper.prop('InputProps'), { inputProps: { min: 0, step: 1 } });
});

test('has label text', t => {
  const label = 'someLabel';
  const wrapper = renderNatAmountInput({ label });
  t.is(wrapper.find('label').text(), label, 'has correct text in label');
  t.is(wrapper.find('legend').text(), label, 'has correct text in legend');
});

test('has input value', t => {
  const value = 5n;
  const wrapper = renderNatAmountInput({ value });
  t.is(
    wrapper.find('input').attr('value'),
    value.toString(),
    'has correct value',
  );
});

test('disabled=false', t => {
  const wrapper = renderNatAmountInput({ disabled: false });
  const input = wrapper.find('input');
  t.false(input.hasClass('Mui-disabled'));
  t.is(input.attr('disabled'), undefined);
});

test('disabled=true', t => {
  const wrapper = renderNatAmountInput({ disabled: true });
  const input = wrapper.find('input');
  t.is(input.attr('disabled'), 'disabled');
  t.true(input.hasClass('Mui-disabled'));
});

test('error=false', t => {
  const wrapper = renderNatAmountInput({ error: false });
  const input = wrapper.find('input');
  const label = wrapper.find('label');
  t.false(label.hasClass('Mui-error'));
  t.is(input.attr('aria-invalid'), 'false');
});

test('error=true', t => {
  const wrapper = renderNatAmountInput({ error: true });
  const input = wrapper.find('input');
  const label = wrapper.find('label');
  t.true(label.hasClass('Mui-error'));
  t.is(input.attr('aria-invalid'), 'true');
});

test('can simulate input - just calls onChange', async t => {
  let receivedValue;
  const onChange = newValue => {
    receivedValue = newValue;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    wrapper.setProps({ value: receivedValue });
  };
  const wrapper = makeShallowNatAmountInput({ onChange });

  const firstValue = 50n;
  wrapper.simulate('change', { target: { value: firstValue.toString() } });
  t.is(receivedValue, firstValue);
  t.is(wrapper.prop('value'), firstValue.toString());

  const secondValue = 100n;
  wrapper.simulate('change', { target: { value: secondValue.toString() } });
  t.is(receivedValue, secondValue);
  t.is(wrapper.prop('value'), secondValue.toString());
});

test('displays 3 eth correctly', t => {
  // 1 eth is 10^18 wei, or 18 decimal points to the right
  const wei = 10n ** 18n;

  // wei in 3 eth
  const wei3 = 3n * wei;
  const wrapper = renderNatAmountInput({
    value: wei3,
    decimalPlaces: 18,
    placesToShow: 2,
  });
  t.is(wrapper.find('input').attr('value'), '3.00', 'has correct value');

  const wrapper2 = renderNatAmountInput({
    value: wei3,
    decimalPlaces: 18,
    placesToShow: 0,
  });
  t.is(wrapper2.find('input').attr('value'), '3', 'has correct value');

  const wrapper3 = renderNatAmountInput({
    value: wei3,
    decimalPlaces: 18,
    placesToShow: 1,
  });
  t.is(wrapper3.find('input').attr('value'), '3.0', 'has correct value');

  const wrapper4 = renderNatAmountInput({
    value: wei3,
    decimalPlaces: 18,
    placesToShow: 10,
  });
  t.is(
    wrapper4.find('input').attr('value'),
    '3.0000000000',
    'has correct value',
  );

  const wrapper5 = renderNatAmountInput({
    value: 100000000000000n * wei,
    decimalPlaces: 18,
    placesToShow: 2,
  });
  t.is(
    wrapper5.find('input').attr('value'),
    '100000000000000.00',
    'has correct value',
  );
});

test.todo('negative values error');
test.todo(
  `you can click on the input and change the value, which changes the prop 'value'`,
);
