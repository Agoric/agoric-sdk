// Taken from window.DAPP_CONSTANTS_JSON in index.html, defaulting to .env.local.
import defaults from './defaults';
export default window.DAPP_CONSTANTS_JSON ||
  (process.env.REACT_APP_DAPP_CONSTANTS_JSON ?
    JSON.parse(process.env.REACT_APP_DAPP_CONSTANTS_JSON) :
    defaults);
