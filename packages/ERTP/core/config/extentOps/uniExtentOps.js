import harden from '@agoric/harden';

import { insist } from '../../../util/insist';
import {
  sameStructure,
  mustBeSameStructure,
  mustBeComparable,
} from '../../../util/sameStructure';

// The uniExtentOps represents extents that can never be combined.
// For example, usually there is only one invite in an invite purse or
// payment. (Using a listExtentOps is an alternative, but when there is
// usually a extent of one, it's bothersome to always have to grab
// the first item in the list rather than just represent the item
// itself.)

// The uni extents are either empty (null) or unique. Combining two
// non-null uni extents fails because they represent non-combinable
// rights. In a commonly used pattern, uni extents contain an id
// represented by a unique empty object.

const makeUniExtentOps = (customInsistKind = () => {}) => {
  const uniExtentOps = harden({
    insistKind: extent => {
      if (extent === null) {
        return;
      }
      mustBeComparable(extent);
      customInsistKind(extent);
    },
    empty: _ => null,
    isEmpty: uni => uni === null,
    includes: (whole, part) => {
      // the part is only included in the whole if the part is null or
      // if the part equals the whole
      return uniExtentOps.isEmpty(part) || uniExtentOps.equals(whole, part);
    },
    equals: sameStructure,
    with: (left, right) => {
      // left and right can only be added together if one of them is null
      if (uniExtentOps.isEmpty(left)) {
        return right;
      }
      if (uniExtentOps.isEmpty(right)) {
        return left;
      }
      throw insist(false)`Cannot combine uni extents ${left} and ${right}`;
    },
    without: (whole, part) => {
      // we can only subtract the part from the whole if either part
      // is null or the part equals the whole
      if (uniExtentOps.isEmpty(part)) {
        return whole;
      }
      mustBeSameStructure(
        whole,
        part,
        'Cannot subtract different uni descriptions',
      );
      return uniExtentOps.empty();
    },
  });
  return uniExtentOps;
};

harden(makeUniExtentOps);

export { makeUniExtentOps };
