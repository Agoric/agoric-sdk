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
               # Custom Node.js 20.9.0 package
        custom_node_20_9 = pkgs.stdenv.mkDerivation {
          pname = "nodejs";
          version = "20.9.0";
          
          src = pkgs.fetchurl {
            url = "https://nodejs.org/dist/v20.9.0/node-v20.9.0-${if pkgs.stdenv.isDarwin then "darwin" else "linux"}-${if pkgs.stdenv.isAarch64 then "arm64" else "x64"}.tar.gz";
            sha256 = if pkgs.stdenv.isDarwin && pkgs.stdenv.isAarch64 then
              "0snfsz2mmjdavi38nglayw5yia74q9h1xzz2ahpri8yqx1md9lii" # darwin-arm64
            else if pkgs.stdenv.isDarwin then
              "a754c4ef8a4ef3704a04975306a1c59b4b1345661d744927d8f06dd2397c1210" # darwin-x64
            else if pkgs.stdenv.isAarch64 then
              "06d64757931d08d47c159d124ecd3c8328827c40fd220d09b5c65c5c98aa0568" # linux-arm64
            else
              "39db293cf8e3d8875557d056821bbacc4755d9bc4fb670c7425143d3453e809e"; # linux-x64
          };

          installPhase = ''
              echo "installing nodejs"
              mkdir -p $out
              cp -r ./ $out/
            '';


          # Meta information for the package
          meta = with pkgs.lib; {
            description = "Node.js 20.9.0 JavaScript runtime";
            homepage = "https://nodejs.org";
            license = licenses.mit;
            platforms = platforms.unix;
          };
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            custom_node_20_9
            (yarn.override { nodejs = custom_node_20_9; })
            python3
            pkg-config
            go_1_23
            gopls
            delve
            gcc
            gnumake
            protobuf
            buf
            git
          ];

          shellHook = ''
            export PATH=$PATH:$HOME/go/bin

            echo "Node.js $(node --version)"
            echo "NPM $(npm --version)"
            echo "Yarn using Node.js $(yarn node -v)"
          '';
        };
      }
    );
}
