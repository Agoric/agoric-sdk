
reset:
	rm -rf state

run:
	./bin/smart-relay

poke-http:
	curl http://localhost:8000/hello
	@echo

poke-bridge:
	curl http://localhost:8000/sendIntoBridge
	@echo

install-echo-handler:
	curl --data-binary @./echo-handler.js -H "content-type: text/plain" http://localhost:8000/install
	@echo
