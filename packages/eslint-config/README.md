# ESLint Configuration - Flat Config

This package now provides both legacy and flat ESLint configurations for maximum compatibility.

## Usage

### Legacy Format (for backward compatibility)
```javascript
// .eslintrc.js or similar
module.exports = {
  extends: ['@agoric'],
  // ... your config
};
```

### Flat Config Format (ESLint v9+)
```javascript
// eslint.config.mjs
import agoricConfig from '@agoric/eslint-config/flat';

export default [
  ...agoricConfig,
  // ... your additional config objects
];
```

### With FlatCompat (current approach)
```javascript
// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';

const compat = new FlatCompat({...});

export default [
  ...fixupConfigRules(compat.extends('@agoric')),
  // ... your config
];
```

## Files

- `eslint-config.cjs` - Legacy format for backward compatibility
- `eslint-config-flat.mjs` - New flat config format
- `package.json` - Exports both formats via the `exports` field

## Benefits

- **Backward Compatible**: Existing projects continue to work
- **Future Ready**: New projects can use flat config format
- **PNPM Compatible**: Works with PNPM package manager
- **ESLint v9 Ready**: Uses the latest ESLint flat config format