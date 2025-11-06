/* eslint-env node */
/* eslint-disable no-underscore-dangle -- allow for local */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

/**
 * Build script that gives fine-grained control over which modules are minified.
 *
 * Usage: node ./scripts/build.mjs <entry> <outfile> [metafile]
 *
 * Paths are resolved relative to the package directory. By default, any module
 * path containing "node_modules" or "vendor" is aggressively minified.
 *
 * Configure additional aggressive minification by setting
 * AGGRESSIVE_MINIFY_PACKAGES to a comma-separated list of package names
 * (e.g. "@endo/marshal,@endo/far"). You can also provide
 * AGGRESSIVE_MINIFY_FILTERS with comma-separated regular expressions for
 * pathname matching when package names are not sufficient.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');

const [entryArg, outfileArg, metafileArg] = process.argv.slice(2);

if (!entryArg || !outfileArg) {
  console.error('Usage: node ./scripts/build.mjs <entry> <outfile> [metafile]');
  process.exit(1);
}

const entryFile = path.resolve(projectRoot, entryArg);
const bundleFile = path.resolve(projectRoot, outfileArg);
const metafilePath = path.resolve(
  projectRoot,
  metafileArg ||
    path.join(path.dirname(outfileArg), `${path.basename(outfileArg)}.meta.json`),
);

const escapeRegExp = string => string.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');

const splitEnvList = (value = '') =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const defaultPatterns = [/[/\\]node_modules[/\\]/, /[/\\]vendor[/\\]/];

const packagePatterns = splitEnvList(
  process.env.AGGRESSIVE_MINIFY_PACKAGES,
).map(pkg => {
  const escaped = escapeRegExp(pkg).replace(/\//g, '[\\\\/]');
  return new RegExp(`node_modules[\\\\/]${escaped}[\\\\/]`);
});

const filterPatterns = splitEnvList(process.env.AGGRESSIVE_MINIFY_FILTERS).map(
  expr => {
    try {
      return new RegExp(expr);
    } catch (error) {
      throw new Error(
        `Invalid regular expression in AGGRESSIVE_MINIFY_FILTERS: ${expr}`,
        {
          cause: error,
        },
      );
    }
  },
);

const aggressivePatterns = [
  ...defaultPatterns,
  ...packagePatterns,
  ...filterPatterns,
];

const selectiveMinifyPlugin = patterns => ({
  name: 'selective-minify',
  setup(build) {
    if (!patterns.length) {
      return;
    }

    const match = filename => patterns.some(pattern => pattern.test(filename));

    build.onLoad({ filter: /.*/ }, async args => {
      if (!match(args.path)) {
        return null;
      }

      const source = await fs.readFile(args.path, 'utf8');
      const ext = path.extname(args.path).slice(1);
      const loader = ext || 'js';

      const result = await esbuild.transform(source, {
        loader,
        minify: true,
        minifySyntax: true,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        target: build.initialOptions.target ?? 'es2022',
        sourcefile: args.path,
      });

      return {
        contents: result.code,
        loader: result.loader ?? (loader === 'json' ? 'json' : 'js'),
        warnings: result.warnings,
        resolveDir: path.dirname(args.path),
      };
    });
  },
});

const ensureDirForFile = async filePath => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const buildBundle = async () => {
  await Promise.all([ensureDirForFile(bundleFile), ensureDirForFile(metafilePath)]);

  const result = await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    platform: 'neutral',
    mainFields: ['main'],
    absWorkingDir: projectRoot,
    outfile: bundleFile,
    metafile: true,
    plugins: [selectiveMinifyPlugin(aggressivePatterns)],
    logLevel: 'info',
  });

  if (result.metafile) {
    await fs.writeFile(metafilePath, JSON.stringify(result.metafile, null, 2));

    const analysis = await esbuild.analyzeMetafile(result.metafile, {
      verbose: process.env.BUILD_ANALYZE === 'verbose',
    });
    console.log(analysis);
  }
};

buildBundle().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
