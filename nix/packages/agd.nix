{ pkgs, lib, stdenv }:

pkgs.buildGoModule rec {
  pname = "agd";
  version = "0.34.1";

  src = ../../golang/cosmos;

  vendorHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; # Will need to be updated

  subPackages = [ "cmd/agd" ];

  buildInputs = with pkgs; [
    pkg-config
  ];

  # Copy ldflags from Makefile
  ldflags = [
    "-X github.com/cosmos/cosmos-sdk/version.Name=agoriccosmos"
    "-X github.com/cosmos/cosmos-sdk/version.AppName=agd" 
    "-X github.com/cosmos/cosmos-sdk/version.Version=${version}"
    "-X github.com/cosmos/cosmos-sdk/version.Commit=nix-build"
    "-X github.com/cosmos/cosmos-sdk/version.BuildTags=ledger"
  ];

  # Copy build tags from Makefile
  tags = [ "ledger" ];

  meta = with lib; {
    description = "Agoric Cosmos daemon - blockchain node for Agoric smart contract platform";
    homepage = "https://github.com/Agoric/agoric-sdk";
    license = licenses.asl20;
    platforms = platforms.unix;
    mainProgram = "agd";
  };
} 