/**
 * Assess the facetiousness of a value.  If the value is an object containing
 * only named properties and each such property's value is a function, `obj`
 * represents a single facet and 'one' is returned.  If each property's value
 * is instead an object of facetiousness 'one', `obj` represents multiple
 * facets and 'many' is returned.  In all other cases `obj` does not represent
 * any kind of facet abstraction and 'not' is returned.
 *
 * @typedef {'one'|'many'|'not'} Facetiousness
 *
 * @param {*} obj  The (alleged) object to be assessed
 * @returns {Facetiousness} an assessment of the facetiousness of `obj`
 */
export function assessFacetiousness(obj) {
  if (typeof obj !== 'object') {
    return 'not';
  }
  let result;
  for (const prop of Reflect.ownKeys(obj)) {
    const value = obj[prop];
    let resultFromProp;
    if (typeof value === 'function') {
      resultFromProp = 'one';
    } else if (
      // symbols are not permitted as facet names
      typeof prop !== 'symbol' &&
      assessFacetiousness(value) === 'one'
    ) {
      resultFromProp = 'many';
    } else {
      return 'not';
    }
    if (!result) {
      // capture the result of inspecting the first property
      result = resultFromProp;
    } else if (resultFromProp !== result) {
      // and bail out upon encountering any deviation
      return 'not';
    }
  }
  // empty objects are methodless Far objects
  return /** @type {Facetiousness} */ (result || 'one');
}
