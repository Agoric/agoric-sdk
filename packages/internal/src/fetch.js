/**
 * @param {Response} response
 * @param {string} [what]
 * @returns {Error}
 */
export const makeFetchError = (response, what = 'Fetch') => {
  const location = response.url ? ` at ${response.url}` : '';
  return Error(
    `${what} failed (${response.status} ${response.statusText})${location}`,
  );
};

/**
 * @param {typeof fetch} fetchImpl
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 * @param {string} [what]
 * @returns {Promise<Response>}
 */
export const fetchOk = (fetchImpl, input, init = undefined, what = 'Fetch') =>
  fetchImpl(input, init).then(response => {
    if (!response.ok) {
      throw makeFetchError(response, what);
    }
    return response;
  });
