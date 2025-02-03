{
  description = "Agoric SDK Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs-20_x
            yarn
            python3
            pkg-config
            go_1_21
            gopls
            delve
            gcc
            gnumake
            protobuf
            buf
          ];

          shellHook = ''
            export PATH=$PATH:$HOME/go/bin
          '';
        };
      }
    );
}
