OPAM_SWITCH ?= iris
OCAML_VER ?= 4.14.1
COQ_VER ?= 8.18.0

.PHONY: help ubuntu-deps opam-init switch install build clean env

help:
	@echo "Targets:"
	@echo "  ubuntu-deps  Install system packages needed on Ubuntu"
	@echo "  opam-init    Initialize opam if needed"
	@echo "  switch       Create/select opam switch $(OPAM_SWITCH)"
	@echo "  install      Install Coq and Iris in the switch"
	@echo "  build        Build all .v files in the current directory"
	@echo "  clean        Remove Coq build artifacts"
	@echo "  env          Print shell command to load the switch env"

ubuntu-deps:
	sudo apt update
	sudo apt install -y build-essential m4 pkg-config bubblewrap opam git

opam-init:
	opam init --disable-sandboxing -y

switch:
	# Use system OCaml if available to avoid long compiler build
	opam switch create $(OPAM_SWITCH) ocaml-system || opam switch set $(OPAM_SWITCH)
	eval "$$(opam env --switch=$(OPAM_SWITCH))" && ocaml -version

install:
	eval "$$(opam env --switch=$(OPAM_SWITCH))" && \
	opam repo add coq-released https://coq.inria.fr/opam/released -y && \
	opam update && \
	opam install -y coq.$(COQ_VER) coq-iris coq-lsp

build:
	eval "$$(opam env --switch=$(OPAM_SWITCH))" && \
	sh -c 'set -e; files=$$(ls *.v 2>/dev/null || true); if [ -z "$$files" ]; then echo "No .v files found"; exit 0; fi; for f in $$files; do echo "coqc $$f"; coqc $$f; done'

clean:
	rm -f *.vo *.vos *.vok .*.aux *.glob

env:
	@echo 'eval "$$(opam env --switch=$(OPAM_SWITCH))"'
