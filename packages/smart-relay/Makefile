
reset:
	rm -rf state

run:
	./bin/smart-relay

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

install-halfdrop-handler:
	curl --data-binary @./halfdrop-handler.js -H "content-type: text/plain" http://localhost:8000/install
	@echo
