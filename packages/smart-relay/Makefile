# Get the path to our nchainz script.
NCHAINZ := ./bin/nchainz

init:
	rm -rf state
	$(NCHAINZ) init norun agoric agoric
	@echo "Next run \`make run' and \`make relay' in separate terminals"

run:
	$(NCHAINZ) run

relay:
	./bin/rly start zero -d

poke-http:
	curl http://localhost:8000/hello
	@echo

poke-bridge-handshake:
	curl http://localhost:8000/sendIntoBridge/is-handshake
	@echo
poke-bridge-packet:
	curl http://localhost:8000/sendIntoBridge/is-packet
	@echo
poke-bridge-ack:
	curl http://localhost:8000/sendIntoBridge/is-ack
	@echo
poke-bridge-unknown:
	curl http://localhost:8000/sendIntoBridge/unknown
	@echo

help:
	@echo 'poke-http                 say hello'
	@echo	'poke-bridge-handshake     send a handshake'
	@echo 'poke-bridge-packet        send a packet'
	@echo 'poke-bridge-ack           send an ack'
	@echo 'poke-bridge-unknown       send an unknown'
	@echo 'install-halfdrop-handler  install a handler that drops half'

install-halfdrop-handler:
	curl --data-binary @./halfdrop-handler.js -H "content-type: text/plain" http://localhost:8000/install
	@echo
