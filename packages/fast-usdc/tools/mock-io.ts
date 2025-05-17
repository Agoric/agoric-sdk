import type { Writable } from 'node:stream';

/**
 * mock stdout / stderr, for example
 *
 * @param buf - caller-provided buffer for written data
 */
export const mockStream = <T extends Writable>(buf: string[]): T =>
  ({
    write: txt => {
      buf.push(txt);
      return true;
    },
  }) as T;
