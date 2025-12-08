import { fail } from 'node:assert';
import { EIP712Domain, EIP712Types } from './types.ts';

type EIP712Packet<T = unknown> = {
  domain: EIP712Domain;
  types: EIP712Types;
  message: T;
}; // ...

/**
 * wallet store key, as used in invokeEntry
 *
 * TODO: consider confusion risk screw cases
 */
type StoreKey = string;

type Formatter = <T>(msg: EIP712Packet<T>) => string;
const formats: Record<StoreKey, Formatter> = {
  'ymax.OpenPortfolio': m => 'open sesame!',
};
/** @throws on not found */
const getFormatter = (name: string): Formatter => {
  const formatter = formats[name] || fail(`no formatter for :${name}`);
  return formatter;
};

type Bytes = Uint8Array;

const EVMProvider = {
  /** @throws on signature failure */
  sign: <T>(msg: EIP712Packet<T>, magic: string) => Promise<Bytes>,
};

const AppServer = {
  post: (body: unknown) => Promise<void>,
};

const YmaxUI = {
  signModeTextual: async <T>(msg: EIP712Packet<T>) => {
    const formatter = getFormatter(msg.domain.name);
    const magic: string = formatter(msg);
    const sig = await EVMProvider.sign(msg, magic);
    await AppServer.post({ msg, sig });
  },
};

const assertSigOk = (sig: Bytes, msg: EIP712Packet, magic: string) => {
  // ...
};

//
const Validator = {
  checkSig: ({ msg, sig }: { msg: EIP712Packet; sig: Bytes }) => {
    const formatter = getFormatter(msg.domain.name);
    const magic: string = formatter(msg);
    assertSigOk(sig, msg, magic);
  },
};
