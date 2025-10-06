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
build: ,ymax0-bundle-id

##
# whole system update. see ymax0-terminate first, though.
redeploy: ,ymax0-deployed introduce-parties prune-vstorage fund-fee-acct

introduce-parties: ,invitePlanner ,inviteResolver

,ymax0-bundle-id: $(DEPLOY)/dist/bundle-ymax0.json
	((cd $(DEPLOY); yarn build:bundle-id) ; cp $(DEPLOY)/dist/ymax0.bundleId $@; cat $@) \
		|| (rm $@; false)

$(DEPLOY)/dist/bundle-ymax0.json:
	(cd $(DEPLOY); yarn build; yarn build:bundle)

provision-ymaxControl:
	$(AGD) tx swingset provision-one yc $(YMAX_CONTROL_ADDR) SMART_WALLET --node $(NODE) --from $(YMAX_CONTROL_ADDR) $(SIG_OPTS)

redeem-ymaxControl:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
		AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --redeem --contract 'postalService' --description 'deliver ymaxControl'

REASON ?=
ymax0-terminate:
	@test -n "$(REASON)" || { echo "REASON not set."; exit 1; }
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --terminate "$(REASON)"

,privateArgsOverrides.json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --buildEthOverrides >$@ || (rm $@; false)

NETCONFIG=https://main.agoric.net/network-config
,ymax0-deployed: ,ymax0-bundle-id ,privateArgsOverrides.json
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --installAndStart $$(cat ,ymax0-bundle-id) <,privateArgsOverrides.json
	agoric follow -B $(NETCONFIG) -lF :published.agoricNames.instance >$@ || (rm $@; false)

,ymax0-installed: ,ymax0-bundle-id
	grep $$($(AGORIC) follow -lF -B $(NETCONFIG) -o json :bundles \
		| jq -r .endoZipBase64Sha512) ,ymax0-bundle-id >$@ \
			|| (rm $@; false)

,creatorFacet: ,ymax0-deployed
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --getCreatorFacet
	touch $@

PLANNER ?= agoric1y3e3mlnrkuh6j2qcnlrtap42j8mzw240vwr74j
,invitePlanner: ,creatorFacet
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --invitePlanner $(PLANNER)
	touch $@
	@echo now use planner MNEMONIC: ymax-tool.ts --redeem

RESOLVER ?= agoric1y3e3mlnrkuh6j2qcnlrtap42j8mzw240vwr74j
,inviteResolver: ,creatorFacet
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) --inviteResolver $(RESOLVER)
	touch $@
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
,ymax0-node.json:
	$(AGD) --node $(NODE) query vstorage data published.ymax0 -o json >$@ \
		|| (rm $@; false)

SIG_OPTS=--chain-id=agoric-3 --gas-adjustment=1.5 --gas=auto
WHALE=gov1
fund-fee-acct: ,ymax0-node.json
	$(AGD) tx bank send $(WHALE) \
		$$($(JQ) -r '.value|fromjson|.values[0]|fromjson|.body|fromjson|.contractAccount' ,ymax0-node.json) \
			120000000ubld -y -b block --node=$(NODE) $(SIG_OPTS)

clean:
	rm -rf ,* $(DEPLOY)/dist/
