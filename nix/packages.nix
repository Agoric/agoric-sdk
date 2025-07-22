{ self', inputs, ... }: {
  perSystem = { system, pkgs, ... }: {
    packages = {
      agd = pkgs.callPackage ./packages/agd.nix { };
      
      # Default package
      default = self'.packages.agd;
    };
  };
} 