{ self', inputs, ... }: {
  perSystem = { system, ... }: {
    # Define a new module argument that other modules can use
    _module.args.nodePkgs = import inputs.nixpkgs-js {
      inherit system;
      
      # Add custom overlay for Node.js
      overlays = [
        (final: prev: {
          nodejs = prev.nodejs_20;
          yarn = prev.yarn.override { 
            nodejs = prev.nodejs_20;
          };
        })
      ];
    };
  };
}
