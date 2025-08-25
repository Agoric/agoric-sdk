# ymaxControl mainnet operations automation

# safe default with explicit prod usage: make AGORIC_NET=main ...
AGORIC_NET ?= devnet

-include secrets.mk
YMAX_ITEM_ID ?=

YMAX_TOOL=../scripts/ymax-tool.ts
BW=bw

# tested with 2025.8.0
# XXX add as multichain-testing devtool, even though only dckc uses it?
bw-install:
	npm install -g @bitwarden/cli
	$(BW) --version

bw-login:
	@test -n "$(BW_EMAIL)" || { echo "BW_EMAIL not set. Usage: make bw-login BW_EMAIL=you@example.com"; exit 1; }
	@$(BW) login "$(BW_EMAIL)"

# To see changes in vault since login...
bw-sync:
	$(BW) sync --session "$BW_SESSION"

list-items:
	@$(BW) list items --search "ymax" --session "$$BW_SESSION" | jq '.[] | {id, name, type}'
	@echo now pick one and update secrets.mk

check-id:
	@$(BW) get username $(YMAX_ITEM_ID)

add-key:
	$(BW) get password $(YMAX_ITEM_ID) | agd keys add ymaxControl

provision-ymaxControl:
	agd tx swingset provision-one yc $(YMAX_CONTROL_ADDR) SMART_WALLET --node $(NODE) --from $(YMAX_CONTROL_ADDR) $(SIG_OPTS)

redeem-ymaxControl:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	@MNEMONIC="$$($(BW) get password $(YMAX_ITEM_ID))" \
		AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --redeem --contract 'postalService' --description 'deliver ymaxControl'

check-vstorage: ,vstorage-outdated-$(AGORIC_NET).json

,vstorage-outdated-$(AGORIC_NET).json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --checkStorage >$@ || \
		(rm $@; false)

prune-vstorage: ,vstorage-outdated-$(AGORIC_NET).json
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	@MNEMONIC="$$($(BW) get password $(YMAX_ITEM_ID))" AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --pruneStorage < $<

clean:
	rm -rf build
