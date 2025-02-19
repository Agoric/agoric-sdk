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
              "1j6cw6i3hjqv8zk1nbsqg560k7rgcmyl9cfd4vlvn5wclzr76nzw" # darwin-x64
            else if pkgs.stdenv.isAarch64 then
              "0skah3bal5irvramnfn86vgi0c375ywsyb4xaxmx3gvlnbpdp9yj" # linux-arm64
            else if (pkgs.stdenv.isLinux && !pkgs.stdenv.isAarch64) then
              "0q3gy4z5b8dd0w37ya5wlkbv4xhyqa1s0zwh71258x5z5w4rz4gh" # linux-x64
            else
              throw "Unsupported system: This derivation only supports Linux (x64/arm64) and Darwin (x64/arm64) systems";
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
            (python3.withPackages (ps: [ ps.distutils ]))
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
