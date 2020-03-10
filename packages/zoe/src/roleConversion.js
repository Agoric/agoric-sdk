import { assert, details } from '@agoric/assert';

export const arrayToObj = (array, roleNames) => {
  assert(
    array.length === roleNames.length,
    details`array and roleNames must be of equal length`,
  );
  const obj = {};
  roleNames.forEach((roleName, i) => (obj[roleName] = array[i]));
  return obj;
};

export const objToArray = (obj, roleNames) => {
  const keys = Object.getOwnPropertyNames(obj);
  assert(
    keys.length === roleNames.length,
    `object keys and roleNames must be of equal length`,
  );
  return roleNames.map(roleName => obj[roleName]);
};
