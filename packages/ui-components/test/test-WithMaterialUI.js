// @ts-check

import test from 'ava';
import React from 'react';
import { shallow } from 'enzyme';

import WithMaterialUI from '../src/WithMaterialUI';

const makeShallowDiv = () => {
  return shallow(
    <WithMaterialUI/>,
  );
};


test('withMaterialUI', t => {
  const wrapper = makeShallowDiv();
  t.true(wrapper.hasClass('myDiv'));
});