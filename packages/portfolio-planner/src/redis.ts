import { Redis } from 'ioredis';

export interface AgoricRedis {
  /**
   * Same as `hset(key, field, value)` only if value is numerically greater than
   * `hget(key, field)`.  Atomic.
   *
   * @param {string} key The Redis key containing the hash to set the field in.
   * @param {string} field The field within the hash to set.
   * @param {number} value The value to set the field to.
   *
   * @returns {number | null} The new value if it was set, or null if the
   * current value was not less than the given value.
   */
  hsetIfGreater: (
    key: string,
    field: string,
    value: number,
  ) => Promise<number | null>;
}

export class AgoricRedis extends Redis {
  constructor(url: string) {
    console.log('Creating AgoricRedis client with options:', { url });
    super(url);

    // Define custom commands here.
    this.defineCommand('hsetIfGreater', {
      numberOfKeys: 1,
      lua: `\
local oldValue = redis.call("HGET", KEYS[1], ARGV[1]);
if not oldValue or tonumber(oldValue) < tonumber(ARGV[2]) then
  redis.call("HSET", KEYS[1], ARGV[1], ARGV[2]);
  return ARGV[2];
end
return nil;
`,
    });
  }
}
