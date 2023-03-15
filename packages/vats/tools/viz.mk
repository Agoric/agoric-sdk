# config: tools outsidet the source tree
VIEWER=firefox
DOT=dot

CONFIG=decentral-test-vaults-config

SRC=../src/core/chain-behaviors.js ../src/core/basic-behaviors.js

DIAGRAM=$(CONFIG)

$(DIAGRAM).svg: $(DIAGRAM).dot
	$(DOT) -Tsvg $< >$@ || rm $@

view: $(DIAGRAM).svg
	$(VIEWER) $<

$(CONFIG).dot: ../$(CONFIG).json $(SRC) authorityViz.js
	node authorityViz.js ../$(CONFIG).json >$@ || rm $@

