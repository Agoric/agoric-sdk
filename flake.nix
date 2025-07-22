{
  description = "Agoric SDK";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    unstable-nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Track a separate nixpkgs for JS/TS toolchains
    nixpkgs-js.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
  };

  outputs = inputs @ { self, nixpkgs, flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      
      imports = [
        ./golang/cosmos/agd.nix
        ./nix/nodejs.nix
        ./nix/devShell.nix
      ];

      perSystem = { self', pkgs, system, ... }:
        let
          unstablePkgs = import inputs.nixpkgs-unstable { inherit system; };
        in
        {
          # Your minimal perSystem config
        };
    };

}
