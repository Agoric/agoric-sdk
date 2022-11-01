import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  return Far('root', {
    foo(p) {
      log('=> Carol: in foo');
      p.then(
        r => log(`=> Carol: in foo p resolved to '${r}'`),
        e => log(`=> Carol: in foo p rejected as '${e}'`),
      );
      log('=> Carol: foo done');
      return 'Carol says foo';
    },
    bar(p) {
      log('=> Carol: in bar');
      p.then(
        r => log(`=> Carol: in bar p resolved to '${r}'`),
        e => log(`=> Carol: in bar p rejected as '${e}'`),
      );
      log('=> Carol: bar done');
      return 'Carol says bar';
    },
  });
}
