# The relayer path to use.
path = zero

init:
	rm -rf state
	./bin/nchainz init norun ibc0=agoric ibc1=agoric
	@echo "Next run \`make run' and \`make relay' in separate terminals"

run:
	./bin/nchainz run

start-relayer:
	PATH="./bin:$$PATH"; ag-nchainz start-relayer

relay:
	@PATH="./bin:$$PATH"; \
  try=0; \
  while ! rly tx link $(path) --timeout=3s -d; do \
    try=$$(( $$try + 1 )); \
    echo "$(path) tx link not yet ready (try=$$try)"; \
    sleep 1; \
  done; \
	rly start -d "$(path)"

poke-http:
	curl http://localhost:8008/hello
	@echo

poke-bridge-handshake:
	curl http://localhost:8008/sendIntoBridge/is-handshake
	@echo
poke-bridge-packet:
	curl http://localhost:8008/sendIntoBridge/is-packet
	@echo
poke-bridge-ack:
	curl http://localhost:8008/sendIntoBridge/is-ack
	@echo
poke-bridge-unknown:
	curl http://localhost:8008/sendIntoBridge/unknown
	@echo

help:
	@echo 'poke-http                 say hello'
	@echo	'poke-bridge-handshake     send a handshake'
	@echo 'poke-bridge-packet        send a packet'
	@echo 'poke-bridge-ack           send an ack'
	@echo 'poke-bridge-unknown       send an unknown'
	@echo 'install-halfdrop-handler  install a handler that drops half'
	@echo 'install-delay-handler     install a handler that delays'

install-halfdrop-handler:
	curl --data-binary @./halfdrop-handler.js -H "content-type: text/plain" http://localhost:8008/install
	@echo

install-delay-handler:
	curl --data-binary @./delay-handler.js -H "content-type: text/plain" http://localhost:8008/install
	@echo
