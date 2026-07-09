# ymaxControl mainnet operations automation

# safe default with explicit prod usage: make AGORIC_NET=main ...
AGORIC_NET ?= devnet

CONTRACT ?= ymax0

YMAX_TOOL=../scripts/ymax-tool.ts
WALLET_ADMIN=../../packages/portfolio-deploy/scripts/wallet-admin.ts
AGD=agd
AGORIC=agoric
JQ=jq

DEPLOY=../../packages/portfolio-deploy
# Optional operator-supplied JSON file; omitted means privateArgsOverrides = {}
PRIVATE_ARGS_OVERRIDES ?=
OVERRIDES_ARG=$(if $(PRIVATE_ARGS_OVERRIDES),--overrides $(PRIVATE_ARGS_OVERRIDES),)

##
# default make target: no chain interaction
build: ,ymax-bundle-id

##
# whole system update. see ymax0-terminate first, though.
redeploy: ,$(CONTRACT)-deployed introduce-parties prune-vstorage fund-fee-acct

introduce-parties: ,invitePlanner-$(CONTRACT) ,inviteResolver-$(CONTRACT)

,ymax-bundle-id: $(DEPLOY)/dist/bundle-ymax0.json
	((cd $(DEPLOY); yarn build:bundle-id) ; cp $(DEPLOY)/dist/ymax0.bundleId $@; cat $@) \
		|| (rm $@; false)

$(DEPLOY)/dist/bundle-ymax0.json:
	(cd $(DEPLOY); yarn build; yarn build:bundle)

provision-ymaxControl: ,$(CONTRACT)-control-provisioned.json

## per https://www.mintscan.io/agoric/proposals/111
ifeq ($(CONTRACT),ymax0)
ifeq ($(AGORIC_NET),main)
YMAX_CONTROL_ADDR := agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq
else ifeq ($(AGORIC_NET),devnet)
YMAX_CONTROL_ADDR := agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv
endif
else ifeq ($(CONTRACT),ymax1)
YMAX_CONTROL_ADDR := agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928
endif

PAYER=agoric16nwqe7452za92rwvnldmfdqr34n5rzhphe9sjy

show-payer-balance:
	$(AGD) query bank balances $(PAYER) --output json --node $(NODE) | jq -c '.balances[]? | select(.denom=="ubld")'

show-ymaxControl-balance:
	$(AGD) query bank balances $(YMAX_CONTROL_ADDR) --output json --node $(NODE) | jq -c '.balances[]?'

,$(CONTRACT)-control-provisioned.json: show-payer-balance
	$(AGD) tx swingset provision-one yc $(YMAX_CONTROL_ADDR) SMART_WALLET --node $(NODE) --from $(PAYER) $(SIG_OPTS) --fees 5000ubld -o json --yes >$@ || \
		(rm $@; false)
	@jq -c '{code, height, txhash, raw_log}' $@

,$(CONTRACT)-planner-provisioned.json: show-payer-balance
	$(AGD) tx swingset provision-one yc $(PLANNER) SMART_WALLET --node $(NODE) --from $(PAYER) $(SIG_OPTS) --fees 5000ubld -o json --yes >$@ || \
		(rm $@; false)
	@jq -c '{code, height, txhash, raw_log}' $@

show-ymaxControl-invitations:
	$(AGORIC) follow -lF -B https://main.agoric.net/network-config :published.wallet.$(YMAX_CONTROL_ADDR).current

redeem-ymaxControl:
	@[ -n "$$MNEMONIC" ] || (echo "ymaxControl MNEMONIC not set; see 1password"; false)
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/redeem-invitation.ts --contract postalService --description 'deliver ymaxControl'

REASON ?=
$(CONTRACT)-terminate:
	@test -n "$(REASON)" || { echo "REASON not set."; exit 1; }
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-terminate.ts --contract $(CONTRACT) --message "$(REASON)"

NETCONFIG=https://$(AGORIC_NET).agoric.net/network-config
,$(CONTRACT)-deployed: ,ymax-bundle-id ,ymax-installed
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-install-and-start.ts --contract $(CONTRACT) --bundle "$$(cat ,ymax-bundle-id)" $(OVERRIDES_ARG)
	agoric follow -B $(NETCONFIG) -lF :published.agoricNames.instance >$@ || (rm $@; false)
	tail $@

,ymax-installed: ,ymax-bundle-id
	grep $$($(AGORIC) follow -lF -B $(NETCONFIG) -o json :bundles \
		| jq -r .endoZipBase64Sha512) ,ymax-bundle-id >$@ \
			|| (rm $@; false)

,creatorFacet-$(CONTRACT): ,$(CONTRACT)-deployed
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-get-creator-facet.ts --contract $(CONTRACT)
	touch $@

PLANNER ?= agoric1y3e3mlnrkuh6j2qcnlrtap42j8mzw240vwr74j
,invitePlanner-$(CONTRACT): ,creatorFacet-$(CONTRACT) ,$(CONTRACT)-planner-provisioned.json
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-deliver-invitation.ts --contract $(CONTRACT) --kind planner --to $(PLANNER) >$@ || \
		(rm $@; false)
	tail $@
	@echo now use planner MNEMONIC: $(WALLET_ADMIN) $(DEPLOY)/src/redeem-invitation.ts --contract $(CONTRACT) --description planner

RESOLVER ?= agoric1y3e3mlnrkuh6j2qcnlrtap42j8mzw240vwr74j
,inviteResolver-$(CONTRACT): ,creatorFacet-$(CONTRACT)
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-deliver-invitation.ts --contract $(CONTRACT) --kind resolver --to $(RESOLVER) >$@ || \
		(rm $@; false)
	tail $@
	@echo now use resolver MNEMONIC: $(WALLET_ADMIN) $(DEPLOY)/src/redeem-invitation.ts --contract $(CONTRACT) --description resolver --no-save

check-vstorage: ,vstorage-outdated-$(AGORIC_NET).json

,vstorage-outdated-$(AGORIC_NET).json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --checkStorage >$@ || \
		(rm $@; false)

prune-vstorage: ,vstorage-pruned

,vstorage-pruned: ,vstorage-outdated-$(AGORIC_NET).json
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(WALLET_ADMIN) $(DEPLOY)/src/ymax-prune-storage.ts --contract $(CONTRACT) --input $<
	touch $@

NODE=https://main.rpc.agoric.net:443
,$(CONTRACT)-node.json:
	$(AGD) --node $(NODE) query vstorage data published.$(CONTRACT) -o json >$@ \
		|| (rm $@; false)

FEES=3000ubld
SIG_OPTS=--chain-id=agoric-3 --gas-adjustment=1.4 --gas=auto --fees=$(FEES)
FUNDS=1234000000ubld
fund-fee-acct: ,$(CONTRACT)-node.json
	$(AGD) tx bank send $(PAYER) \
		$$($(JQ) -r '.value|fromjson|.values[0]|fromjson|.body|fromjson|.contractAccount' ,$(CONTRACT)-node.json) \
			$(FUNDS) -y -b block --node=$(NODE) $(SIG_OPTS)

,ymax-upgrade.js: ,ymax-bundle-id
	echo "await E(ymaxControl).upgrade('$$(cat ,ymax-bundle-id)').catch(err=>console.error(err));" >$@


# check that the account we're using matches the contract we're upgrading...
check-control-account:
	$(WALLET_ADMIN) $(DEPLOY)/src/ymax-repl.ts </dev/null | grep $(YMAX_CONTROL_ADDR)

,$(CONTRACT)-upgraded: ,ymax-bundle-id ,ymax-installed
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-upgrade.ts --contract $(CONTRACT) $(OVERRIDES_ARG) --bundle "$$(cat ,ymax-bundle-id)" >$@ || (mv $@ $(@)_ERR; false)

,$(CONTRACT)-upgraded-repl: ,ymax-upgrade.js ,ymax-installed
	AGORIC_NET=$(AGORIC_NET) \
		$(WALLET_ADMIN) $(DEPLOY)/src/ymax-repl.ts <,ymax-upgrade.js >$@ || (mv $@ $(@)_ERR; false)

clean:
	rm -rf ,* $(DEPLOY)/dist/
