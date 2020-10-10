import { makeExternalStore as es } from '@agoric/store';

export const hello = es('foo', (msg = 'Hello') => ({
  hello(nickname) {
    const es = msg;
    msg += 'o';
    msg = es + 'p';
    const _data = nickname;
    return `${es}, ${_data}`;
  },
}));
