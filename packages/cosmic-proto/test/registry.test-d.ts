import { expectNotAssignable, expectType } from 'tsd';
import { GlobalDecoderRegistry } from '../dist/codegen/registry.js';
import type { IAminoMsg } from '../dist/codegen/types.js';

type Message = { text: string };
declare const message: Message;
const envelope = { type: 'test/Message', value: { text: 'hello' } };
expectType<Message>(
  GlobalDecoderRegistry.fromAminoMsg<Message, Message>(envelope),
);
expectType<IAminoMsg<Message>>(
  GlobalDecoderRegistry.toAminoMsg<Message, Message>(message),
);
type AminoInput = Parameters<
  typeof GlobalDecoderRegistry.fromAminoMsg<Message, Message>
>[0];
expectNotAssignable<AminoInput>({ value: message });
expectNotAssignable<AminoInput>({ type: 'test/Message', value: { text: 123 } });
