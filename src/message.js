import { insist } from './insist';
import { insistCapData } from './capdata';

export function insistMessage(message) {
  insist(
    message.method === `${message.method}`,
    `message has non-string .method ${message.method}`,
  );
  insistCapData(message.args);
  if (message.result) {
    insist(
      message.result === `${message.result}`,
      `message has non-string non-null .result ${message.result}`,
    );
  }
}
