// @ts-check
/* eslint-env node */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * @param {object} powers
 * @param {typeof import('http')} powers.http
 */
export const makeJsonHttpClient = ({ http }) => {
  /**
   * @param {object} request
   * @param {string} request.hostname
   * @param {number} request.port
   * @param {string} [request.method]
   * @param {string} [request.path]
   * @param {Record<string, string>} [request.headers]
   * @param {any} [requestBody]
   */
  const request = async (
    { hostname, port, method = 'POST', path = '/', headers = {} },
    requestBody = {},
  ) => {
    const requestText = JSON.stringify(requestBody);
    const requestBytes = textEncoder.encode(requestText);
    const requestLength = requestBytes.byteLength;

    return new Promise((resolve, reject) => {
      const httpRequest = http.request(
        {
          hostname,
          port,
          method,
          path,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Content-Length': `${requestLength}`,
          },
        },
        response => {
          (async () => {
            const chunks = [];
            for await (const chunk of response) {
              chunks.push(chunk);
            }
            const responseBytes = Buffer.concat(chunks);
            const responseText = textDecoder.decode(responseBytes);
            if (response.statusCode !== 200) {
              throw Error(`${responseText}`);
            }
            // May throw: becomes rejection below.
            const responseBody = JSON.parse(responseText);
            resolve(responseBody);
          })().catch(cause => {
            reject(
              Error(`JSON HTTP RPC failed with error: ${cause.message}`, {
                cause,
              }),
            );
          });
        },
      );
      httpRequest.on('error', reject);
      httpRequest.end(Buffer.from(requestBytes));
    });
  };
  return request;
};
