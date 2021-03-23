# Running an Agoric Client

```sh
# Start the ag-solo in the background.
docker-compose up -d
# Look at the logs (hit Control-C to stop looking).
docker-compose logs -f --tail=50
# This is how you get the URL for the REPL/wallet.
docker-compose exec ag-solo npx agoric open --repl
```

Be sure to register as a client with the faucet when prompted.

If you want to pause your client, use:

```sh
# Pause your client, until you run `up` again.
docker-compose down
```

This is safe, since your client state is preserved between up/down cycles.

## DANGER ZONE

If you want to reset the client state (note that this WILL LOSE ALL TOKENS), use
`docker-compose down -v`.
