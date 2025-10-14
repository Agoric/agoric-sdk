# ymaxControl mainnet operations automation

# safe default with explicit prod usage: make AGORIC_NET=main ...
AGORIC_NET ?= devnet

YMAX_TOOL=../scripts/ymax-tool.ts
AGD=agd
AGORIC=agoric
JQ=jq

DEPLOY=../../packages/portfolio-deploy

##
# default make target: no chain interaction
build: ,ymax-bundle-id

CONTRACT=ymax1

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
YMAX_CONTROL_ADDR := agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq
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
		$(YMAX_TOOL) --redeem --contract 'postalService' --description 'deliver ymaxControl'

REASON ?=
$(CONTRACT)-terminate:
	@test -n "$(REASON)" || { echo "REASON not set."; exit 1; }
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --terminate "$(REASON)"

,privateArgsOverrides.json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --buildEthOverrides >$@ || (rm $@; false)

NETCONFIG=https://main.agoric.net/network-config
,$(CONTRACT)-deployed: ,ymax-bundle-id ,privateArgsOverrides.json ,ymax-installed
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --installAndStart $$(cat ,ymax-bundle-id) <,privateArgsOverrides.json
	agoric follow -B $(NETCONFIG) -lF :published.agoricNames.instance >$@ || (rm $@; false)
	tail $@

,ymax-installed: ,ymax-bundle-id
	grep $$($(AGORIC) follow -lF -B $(NETCONFIG) -o json :bundles \
		| jq -r .endoZipBase64Sha512) ,ymax-bundle-id >$@ \
			|| (rm $@; false)

,creatorFacet-$(CONTRACT): ,$(CONTRACT)-deployed
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --getCreatorFacet
	touch $@

PLANNER ?= agoric1y3e3mlnrkuh6j2qcnlrtap42j8mzw240vwr74j
,invitePlanner-$(CONTRACT): ,creatorFacet-$(CONTRACT) ,$(CONTRACT)-planner-provisioned.json
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --invitePlanner $(PLANNER) >$@ || \
		(rm $@; false)
	tail $@
	@echo now use planner MNEMONIC: ymax-tool.ts --redeem

RESOLVER ?= agoric1y3e3mlnrkuh6j2qcnlrtap42j8mzw240vwr74j
,inviteResolver-$(CONTRACT): ,creatorFacet-$(CONTRACT)
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --inviteResolver $(RESOLVER) >$@ || \
		(rm $@; false)
	tail $@
	@echo now use resolver MNEMONIC: ymax-tool.ts --redeem

check-vstorage: ,vstorage-outdated-$(AGORIC_NET).json

,vstorage-outdated-$(AGORIC_NET).json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --checkStorage >$@ || \
		(rm $@; false)

prune-vstorage: ,vstorage-pruned

,vstorage-pruned: ,vstorage-outdated-$(AGORIC_NET).json
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --pruneStorage < $<
	touch $@

NODE=https://main.rpc.agoric.net:443
,$(CONTRACT)-node.json:
	$(AGD) --node $(NODE) query vstorage data published.$(CONTRACT) -o json >$@ \
		|| (rm $@; false)

SIG_OPTS=--chain-id=agoric-3 --gas-adjustment=1.5 --gas=auto
fund-fee-acct: ,$(CONTRACT)-node.json
	$(AGD) tx bank send $(PAYER) \
		$$($(JQ) -r '.value|fromjson|.values[0]|fromjson|.body|fromjson|.contractAccount' ,$(CONTRACT)-node.json) \
			1234000000ubld -y -b block --node=$(NODE) $(SIG_OPTS)

,ymax-upgrade.js: ,ymax-bundle-id
	echo "await E(ymaxControl).upgrade('$$(cat ,ymax-bundle-id)').catch(err=>console.error(err));" >$@


,$(CONTRACT)-upgraded: ,ymax-bundle-id ,ymax-installed ,privateArgsOverrides.json
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --upgrade <,privateArgsOverrides.json $$(cat ,ymax-bundle-id) >$@ || (rm $@; false)

,$(CONTRACT)-upgraded-repl: ,ymax-upgrade.js ,ymax-installed
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --repl <,ymax-upgrade.js >$@ || (rm $@; false)

clean:
	rm -rf ,* $(DEPLOY)/dist/
