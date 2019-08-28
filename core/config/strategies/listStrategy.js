import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { insist } from '../../../util/insist';

// This list strategy follows the Strategy interface defined in
// issuers.chainmail.
const makeListStrategy = (
  insistElementKind,
  isElementEqual,
  compareElements,
) => {
  function includesElement(list, element) {
    for (const e of list) {
      if (isElementEqual(element, e)) {
        return true;
      }
    }
    return false;
  }

  const listStrategy = harden({
    insistKind: list => {
      insist(passStyleOf(list) === 'copyArray')`list must be an array`;
      for (const element of list) {
        insistElementKind(element);
      }
      return harden(list);
    },
    empty: _ => harden([]),
    isEmpty: list => {
      insist(passStyleOf(list) === 'copyArray')`list must be an array`;
      return list.length === 0;
    },
    includes: (whole, part) => {
      for (const partElement of part) {
        if (!includesElement(whole, partElement)) {
          return false; // return early if false
        }
      }
      return true;
    },
    equals: (left, right) =>
      listStrategy.includes(left, right) && listStrategy.includes(right, left),
    with: (left, right) => {
      const combinedList = left.concat(right);
      combinedList.sort(compareElements);
      const dedupedList = [];
      let prev;
      for (const element of combinedList) {
        if (prev === undefined || !isElementEqual(element, prev)) {
          dedupedList.push(element);
        }
        prev = element;
      }
      return harden(dedupedList);
    },
    without: (whole, part) => {
      insist(listStrategy.includes(whole, part))`part is not in whole`;
      const wholeMinusPart = [];
      for (const wholeElement of whole) {
        if (!includesElement(part, wholeElement)) {
          wholeMinusPart.push(wholeElement);
        }
      }
      return harden(wholeMinusPart);
    },
  });
  return listStrategy;
};

harden(makeListStrategy);

export { makeListStrategy };
