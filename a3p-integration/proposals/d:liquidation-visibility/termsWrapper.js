export const termsWrapper = (terms, overrides) => {
  const newTerms = { ...terms };
  for (const [key, value] of Object.entries(overrides)) {
    if (terms.hasOwnProperty(key)) {
      newTerms[key] = value;
    }
  }

  return newTerms;
};