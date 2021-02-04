// @ts-check

import '@agoric/install-ses';

import test from 'ava';
import React from 'react';
import { shallow } from 'enzyme';

import WithoutMaterialUI from '../src/WithoutMaterialUI';

const makeShallowDiv = () => {
  return shallow(
    <WithoutMaterialUI/>,
  );
};


test('withoutMaterialUI', t => {
  const wrapper = makeShallowDiv();
  t.true(wrapper.hasClass('myDiv'));
});