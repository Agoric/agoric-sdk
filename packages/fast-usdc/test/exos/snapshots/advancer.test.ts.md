# Snapshot report for `test/exos/advancer.test.ts`

The actual snapshot is saved in `advancer.test.ts.snap`.

Generated by [AVA](https://avajs.dev).

## stateShape

> Snapshot 1

    {
      borrower: Object @match:kind {
        payload: 'remotable',
      },
      intermediateRecipient: Object @match:or {
        payload: [
          Object @match:kind {
            payload: 'undefined',
          },
          Object @match:splitRecord {
            payload: [
              {
                chainId: Object @match:string {
                  payload: [],
                },
                value: Object @match:string {
                  payload: [],
                },
              },
              {
                encoding: 'bech32',
              },
            ],
          },
        ],
      },
      notifier: Object @match:kind {
        payload: 'remotable',
      },
      poolAccount: Object @match:kind {
        payload: 'remotable',
      },
      settlementAddress: Object @match:or {
        payload: [
          Object @match:kind {
            payload: 'undefined',
          },
          Object @match:splitRecord {
            payload: [
              {
                chainId: Object @match:string {
                  payload: [],
                },
                value: Object @match:string {
                  payload: [],
                },
              },
              {
                encoding: 'bech32',
              },
            ],
          },
        ],
      },
    }
