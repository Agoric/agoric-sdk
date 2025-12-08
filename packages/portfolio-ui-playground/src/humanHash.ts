type FormatString = string; // e.g. ???

type ProtobufMsg = { type: string }; // ...

type MsgType = string;
type Formatter = (msg: ProtobufMsg) => string;
const formats: Record<MsgType, Formatter> = {
  'ymax.OpenPortfolio': m => 'open sesame!',
};

type Bytes = Uint8Array;

const sign = (msg: ProtobufMsg, magic: string) => Promise<Bytes>;
const broadcast = (stuff: unknown) => Promise<void>;

const DApp = {
  signModeTextual: async (msg: ProtobufMsg) => {
    const formatter = formats[msg.type];
    const magic: string = formatter(msg);
    const sig = await sign(msg, magic);
    await broadcast({ msg, sig, mode: 'TEXTUAL' });
  },
};

const assertSigOk = (sig: Bytes, msg: ProtobufMsg, magic: string) => {
  // ...
};

//
const Validator = {
  checkSig: ({ msg, sig }: { msg: ProtobufMsg; sig: Bytes }) => {
    const formatter = formats[msg.type];
    const magic: string = formatter(msg);
    assertSigOk(sig, msg, magic);
  },
};
