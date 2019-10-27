// Vector addition of two extent arrays
export const vectorWith = (extentOpsArray, leftExtents, rightExtents) =>
  leftExtents.map((leftQ, i) => extentOpsArray[i].with(leftQ, rightExtents[i]));

// Vector subtraction of two extent arrays
export const vectorWithout = (extentOpsArray, leftExtents, rightExtents) =>
  leftExtents.map((leftQ, i) =>
    extentOpsArray[i].without(leftQ, rightExtents[i]),
  );
