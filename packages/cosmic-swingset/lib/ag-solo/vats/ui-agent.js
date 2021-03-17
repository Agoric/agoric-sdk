// @ts-check

/**
 * @typedef {Object} UIAgent A user interface agent
 * @property {(...args: any[]) => void} [infoMessage] Display a message to the user
 */

/**
 * @typedef {Object} UIAgentEndowments
 * @property {typeof console} console
 */

/**
 * Create a set of UI agent makers.
 *
 * @param {UIAgentEndowments} param0
 * @returns {{[maker: string]: (petname: string, ext = {}) => UIAgent}}
 */
export default function makeAgentMakers({ console: agentConsole }) {
  return harden({
    /**
     * Create an agent that prints to the console with a petname.
     *
     * @param {string} petname
     * @param {Record<string, any>} [ext={}]
     */
    text(petname, ext = {}) {
      if (petname === undefined) {
        throw TypeError(
          `Specify a petname for the object you're giving this agent to`,
        );
      }
      return harden({
        ...ext,
        infoMessage(...msg) {
          agentConsole.info(petname, 'says:', ...msg);
        },
      });
    },
    /**
     * Create a silent agent.
     *
     * @param {string} _petname
     * @param {Record<string, any>} [ext={}]
     */
    silent(_petname, ext = {}) {
      return harden({
        ...ext,
        infoMessage(..._msg) {},
      });
    },
  });
}
