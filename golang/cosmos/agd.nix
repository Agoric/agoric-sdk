{ self', inputs, ... }: {
  perSystem = { system, pkgs, lib, ... }: 
    let
      packageJson = builtins.fromJSON (builtins.readFile ./package.json);
      name = packageJson.name;
      
      versionName = lib.replaceStrings [ "@" "/" "-" ] [ "" "" "" ] name;
      
      # Use git revision like Union does
      version = inputs.self.rev or inputs.self.dirtyRev;
      gitCommit = inputs.self.shortRev or inputs.self.dirtyShortRev;
      
      buildTags = [ ] ++ lib.optionals pkgs.stdenv.isLinux [ "netgo" "muslc" ];
      buildTagsStr = lib.concatStringsSep "," buildTags;

      baseLdflags = [
        "-X github.com/cosmos/cosmos-sdk/version.Name=${versionName}"
        "-X github.com/cosmos/cosmos-sdk/version.AppName=agd"
        "-X github.com/cosmos/cosmos-sdk/version.Version=${version}"
        "-X github.com/cosmos/cosmos-sdk/version.Commit=${gitCommit}"
        "-X github.com/cosmos/cosmos-sdk/version.BuildTags=${buildTagsStr}"
      ];

      platformLdflags = 
        if pkgs.stdenv.isLinux then [
          "-linkmode external"
          "-extldflags \"-Wl,-z,muldefs -static\""
        ] else if pkgs.stdenv.isDarwin then [
        ] else [];

      allLdflags = baseLdflags ++ platformLdflags;

    in
    {
      packages.agd = 
        (if pkgs.stdenv.isLinux then pkgs.pkgsStatic.buildGoModule else pkgs.buildGoModule) (
          {
            pname = "agd";
            inherit version;

            src = ./.;

            vendorHash = "sha256-HPq26BQUC5MPtqkY+3rCrxOSpkZgrnrTzrsuG8gEZow=";

            subPackages = [ "cmd/agd" ];

            ldflags = allLdflags;
            
            tags = buildTags;

            meta = with lib; {
              description = "Agoric Cosmos daemon - blockchain node for Agoric smart contract platform";
              homepage = "https://agoric.com";
              license = licenses.asl20;
              platforms = platforms.unix;
              mainProgram = "agd";
            };

            # Environment and build inputs
            env = {
              # CGO is required for ledger support
              CGO_ENABLED = "1";
            } // lib.optionalAttrs pkgs.stdenv.isLinux {
              # Static linking flags for Linux
              CGO_CFLAGS = "-I${pkgs.hidapi}/include -I${pkgs.libusb1.dev}/include/libusb-1.0";
              CGO_LDFLAGS = "-static -L${pkgs.musl}/lib -L${pkgs.hidapi}/lib -L${pkgs.libusb1}/lib -lhidapi-libusb -lusb-1.0";
            } // lib.optionalAttrs pkgs.stdenv.isDarwin {
              # Dynamic linking flags for macOS
              CGO_CFLAGS = "-I${pkgs.hidapi}/include -I${pkgs.libusb1.dev}/include/libusb-1.0";
              CGO_LDFLAGS = "-L${pkgs.hidapi}/lib -L${pkgs.libusb1}/lib -lhidapi -lusb-1.0";
            };

            nativeBuildInputs = [ pkgs.pkg-config ] ++ lib.optionals pkgs.stdenv.isLinux [
              # Linux static build requirements
              pkgs.musl
            ] ++ lib.optionals pkgs.stdenv.isDarwin [
              # macOS dynamic build requirements  
              pkgs.makeWrapper
            ];

            buildInputs = [ pkgs.hidapi pkgs.libusb1 pkgs.libusb1.dev ] ++ lib.optionals pkgs.stdenv.isDarwin [
              # macOS frameworks for hardware wallet support
              pkgs.darwin.apple_sdk.frameworks.IOKit
              pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            ];

            # Platform-specific post-build setup
            postFixup = lib.optionalString pkgs.stdenv.isDarwin ''
              # Set up library path for hidapi on macOS
              wrapProgram $out/bin/agd \
                --set DYLD_LIBRARY_PATH ${lib.makeLibraryPath [ pkgs.hidapi ]}
            '';

            # Disable tests that require network or specific setup
            doCheck = false;
          }
        );
    };
}