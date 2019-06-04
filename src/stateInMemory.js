import harden from '@agoric/harden';
import makeKVStore from './kvstore';

export default function makeExternal() {
  const outsideRealmKVStore = makeKVStore({});
  const external = harden({
    sendMsg(msg) {
      const command = JSON.parse(msg);
      const { method, key } = command;
      if (key.includes('undefined')) {
        throw new Error(`key ${key} includes undefined`);
      }
      let result;
      switch (method) {
        case 'get': {
          result = outsideRealmKVStore.get(key);
          break;
        }
        case 'set': {
          const { value } = command;
          outsideRealmKVStore.set(key, value);
          break;
        }
        case 'has': {
          const bool = outsideRealmKVStore.has(key);
          result = [bool]; // JSON compatibility
          break;
        }
        case 'delete': {
          outsideRealmKVStore.delete(key);
          break;
        }
        case 'keys': {
          result = outsideRealmKVStore.keys(key);
          break;
        }
        case 'entries': {
          result = outsideRealmKVStore.entries(key);
          break;
        }
        case 'values': {
          result = outsideRealmKVStore.values(key);
          break;
        }
        case 'size': {
          result = outsideRealmKVStore.size(key);
          break;
        }
        default:
          throw new Error(`unexpected message to kvstore ${msg}`);
      }
      // console.log(msg, '=>', result);
      if (result === undefined) {
        return JSON.stringify(null);
      }
      return JSON.stringify(result);
    },
  });

  return external;
}
