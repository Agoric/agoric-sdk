// @ts-check
import test from 'ava';
import React from 'react';
import { shallow, render } from 'enzyme';

import { NatAmountInput } from '../src';

const makeShallowNatAmountInput = ({
  label = 'myLabel',
  onChange = () => {},
  onError = () => {},
  value = 0,
  displayInfo = { amountMathKind: 'nat', decimalPlaces: 0 },
  disabled = false,
  error = false,
} = {}) => {
  return shallow(
    <NatAmountInput
      label={label}
      onChange={onChange}
      value={value}
      displayInfo={displayInfo}
      disabled={disabled}
      error={error}
      onError={onError}
    />,
  );
};

const renderNatAmountInput = ({
  label = 'myLabel',
  onChange = () => {},
  onError = () => {},
  value = 0,
  displayInfo = { amountMathKind: 'nat', decimalPlaces: 0 },
  disabled = false,
  error = false,
} = {}) => {
  return render(
    <NatAmountInput
      label={label}
      onChange={onChange}
      value={value}
      displayInfo={displayInfo}
      disabled={disabled}
      error={error}
      onError={onError}
    />,
  );
};

test('has props', t => {
  const wrapper = makeShallowNatAmountInput();
  t.is(wrapper.prop('label'), 'myLabel');
  t.is(wrapper.prop('type'), 'number');
  t.is(wrapper.prop('variant'), 'outlined');
  t.is(wrapper.prop('fullWidth'), true);
  t.is(wrapper.prop('disabled'), false);
  t.is(wrapper.prop('error'), false);
  t.is(wrapper.prop('value'), 0);
  t.deepEqual(wrapper.prop('InputProps'), { inputProps: { min: 0 } });
});

test('has label text', t => {
  const label = 'someLabel';
  const wrapper = renderNatAmountInput({ label });
  t.is(wrapper.find('label').text(), label, 'has correct text in label');
  t.is(wrapper.find('legend').text(), label, 'has correct text in legend');
});

test('has input value', t => {
  const value = 5;
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

test('Not MathKind.NAT', t => {
  const displayInfo = { amountMathKind: 'set' };
  let error;
  const onError = err => (error = err);
  // @ts-ignore
  makeShallowNatAmountInput({ displayInfo, onError });
  // @ts-ignore
  t.is(error.message, 'Not a fungible token');
});

test('can simulate input - just calls onChange', t => {
  let receivedValue;
  const onChange = event => {
    receivedValue = event.target.value;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    wrapper.setProps({ value: receivedValue });
  };
  const wrapper = makeShallowNatAmountInput({ onChange });

  const firstValue = 50;
  wrapper.simulate('change', { target: { value: firstValue } });
  t.is(receivedValue, firstValue);
  t.is(wrapper.prop('value'), firstValue);

  const secondValue = 50;
  wrapper.simulate('change', { target: { value: secondValue } });
  t.is(receivedValue, secondValue);
  t.is(wrapper.prop('value'), secondValue);
});

// TODO:
// no negative values allowed but handled well
// value is displayed properly even for things that have decimals
// displayInfo gets used appropriately
// you can click on the input and change the value, which changes the
// prop 'value' (outside component)
