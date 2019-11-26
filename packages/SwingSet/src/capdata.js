import { insist } from './insist';

export function insistCapData(capdata) {
  insist(
    capdata.body === `${capdata.body}`,
    `capdata has non-string .body ${capdata.body}`,
  );
  insist(
    capdata.slots instanceof Array,
    `capdata has non-Array slots ${capdata.slots}`,
  );
}
