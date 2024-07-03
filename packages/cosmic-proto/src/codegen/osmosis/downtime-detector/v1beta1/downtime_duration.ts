//@ts-nocheck
export enum Downtime {
  DURATION_30S = 0,
  DURATION_1M = 1,
  DURATION_2M = 2,
  DURATION_3M = 3,
  DURATION_4M = 4,
  DURATION_5M = 5,
  DURATION_10M = 6,
  DURATION_20M = 7,
  DURATION_30M = 8,
  DURATION_40M = 9,
  DURATION_50M = 10,
  DURATION_1H = 11,
  DURATION_1_5H = 12,
  DURATION_2H = 13,
  DURATION_2_5H = 14,
  DURATION_3H = 15,
  DURATION_4H = 16,
  DURATION_5H = 17,
  DURATION_6H = 18,
  DURATION_9H = 19,
  DURATION_12H = 20,
  DURATION_18H = 21,
  DURATION_24H = 22,
  DURATION_36H = 23,
  DURATION_48H = 24,
  UNRECOGNIZED = -1,
}
export const DowntimeSDKType = Downtime;
export function downtimeFromJSON(object: any): Downtime {
  switch (object) {
    case 0:
    case 'DURATION_30S':
      return Downtime.DURATION_30S;
    case 1:
    case 'DURATION_1M':
      return Downtime.DURATION_1M;
    case 2:
    case 'DURATION_2M':
      return Downtime.DURATION_2M;
    case 3:
    case 'DURATION_3M':
      return Downtime.DURATION_3M;
    case 4:
    case 'DURATION_4M':
      return Downtime.DURATION_4M;
    case 5:
    case 'DURATION_5M':
      return Downtime.DURATION_5M;
    case 6:
    case 'DURATION_10M':
      return Downtime.DURATION_10M;
    case 7:
    case 'DURATION_20M':
      return Downtime.DURATION_20M;
    case 8:
    case 'DURATION_30M':
      return Downtime.DURATION_30M;
    case 9:
    case 'DURATION_40M':
      return Downtime.DURATION_40M;
    case 10:
    case 'DURATION_50M':
      return Downtime.DURATION_50M;
    case 11:
    case 'DURATION_1H':
      return Downtime.DURATION_1H;
    case 12:
    case 'DURATION_1_5H':
      return Downtime.DURATION_1_5H;
    case 13:
    case 'DURATION_2H':
      return Downtime.DURATION_2H;
    case 14:
    case 'DURATION_2_5H':
      return Downtime.DURATION_2_5H;
    case 15:
    case 'DURATION_3H':
      return Downtime.DURATION_3H;
    case 16:
    case 'DURATION_4H':
      return Downtime.DURATION_4H;
    case 17:
    case 'DURATION_5H':
      return Downtime.DURATION_5H;
    case 18:
    case 'DURATION_6H':
      return Downtime.DURATION_6H;
    case 19:
    case 'DURATION_9H':
      return Downtime.DURATION_9H;
    case 20:
    case 'DURATION_12H':
      return Downtime.DURATION_12H;
    case 21:
    case 'DURATION_18H':
      return Downtime.DURATION_18H;
    case 22:
    case 'DURATION_24H':
      return Downtime.DURATION_24H;
    case 23:
    case 'DURATION_36H':
      return Downtime.DURATION_36H;
    case 24:
    case 'DURATION_48H':
      return Downtime.DURATION_48H;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return Downtime.UNRECOGNIZED;
  }
}
export function downtimeToJSON(object: Downtime): string {
  switch (object) {
    case Downtime.DURATION_30S:
      return 'DURATION_30S';
    case Downtime.DURATION_1M:
      return 'DURATION_1M';
    case Downtime.DURATION_2M:
      return 'DURATION_2M';
    case Downtime.DURATION_3M:
      return 'DURATION_3M';
    case Downtime.DURATION_4M:
      return 'DURATION_4M';
    case Downtime.DURATION_5M:
      return 'DURATION_5M';
    case Downtime.DURATION_10M:
      return 'DURATION_10M';
    case Downtime.DURATION_20M:
      return 'DURATION_20M';
    case Downtime.DURATION_30M:
      return 'DURATION_30M';
    case Downtime.DURATION_40M:
      return 'DURATION_40M';
    case Downtime.DURATION_50M:
      return 'DURATION_50M';
    case Downtime.DURATION_1H:
      return 'DURATION_1H';
    case Downtime.DURATION_1_5H:
      return 'DURATION_1_5H';
    case Downtime.DURATION_2H:
      return 'DURATION_2H';
    case Downtime.DURATION_2_5H:
      return 'DURATION_2_5H';
    case Downtime.DURATION_3H:
      return 'DURATION_3H';
    case Downtime.DURATION_4H:
      return 'DURATION_4H';
    case Downtime.DURATION_5H:
      return 'DURATION_5H';
    case Downtime.DURATION_6H:
      return 'DURATION_6H';
    case Downtime.DURATION_9H:
      return 'DURATION_9H';
    case Downtime.DURATION_12H:
      return 'DURATION_12H';
    case Downtime.DURATION_18H:
      return 'DURATION_18H';
    case Downtime.DURATION_24H:
      return 'DURATION_24H';
    case Downtime.DURATION_36H:
      return 'DURATION_36H';
    case Downtime.DURATION_48H:
      return 'DURATION_48H';
    case Downtime.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
