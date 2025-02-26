{ self', inputs, ... }: {
  perSystem = { system, pkgs, nodePkgs, ... }:
  let
    unstablePkgs = import inputs.unstable-nixpkgs { inherit system; };
  in
  {
    devShells.default = pkgs.mkShell {
      name = "agoric-devShell";
      buildInputs = with unstablePkgs; [
        git
        go_1_23
        gopls
        (python3.withPackages (ps: [ ps.distutils ]))
        pkg-config
        go-tools
        gotools
        delve
        gcc
        gnumake
        protobuf
        buf
      ] ++ (with nodePkgs; [
        nodejs
        yarn
      ]);

      shellHook = ''
        export PATH=$PATH:$HOME/go/bin

        echo "Node.js $(node --version)"
        echo "NPM $(npm --version)"
        echo "Yarn using Node.js $(yarn node -v)"
      '';
    };
  };
}