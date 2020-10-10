import { makeExternalStore as es } from '@agoric/store';

export const hello = makeSystemExternalStore('foo', (msg = 'Hello') => ({ msg }), _init => _data2 => ({
  hello(nickname) {
    const es = _data2.msg;
    _data2.msg += 'o';
    _data2.msg = es + 'p';
    const _data = nickname;
    return `${es}, ${_data}`;
  } }));
