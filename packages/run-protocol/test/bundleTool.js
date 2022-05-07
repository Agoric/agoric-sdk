// eslint-disable-next-line import/no-extraneous-dependencies
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';

import bundleSource from '@endo/bundle-source';
import { makePromiseKit } from '@endo/promise-kit';

const { details: X, quote: q } = assert;

export const makeFileReader = (fileName, { fs, path }) => {
  const make = there => makeFileReader(there, { fs, path });
  return harden({
    toString: () => fileName,
    readText: () => fs.promises.readFile(fileName, 'utf-8'),
    neighbor: ref => make(path.resolve(fileName, ref)),
    stat: () => fs.promises.stat(fileName),
    absolute: () => path.normalize(fileName),
    relative: there => path.relative(fileName, there),
    exists: () => fs.existsSync(fileName),
  });
};

export const makeFileWriter = (fileName, { fs, path }) => {
  const make = there => makeFileWriter(there, { fs, path });
  return harden({
    toString: () => fileName,
    writeText: txt => fs.promises.writeFile(fileName, txt),
    readOnly: () => makeFileReader(fileName, { fs, path }),
    neighbor: ref => make(path.resolve(fileName, ref)),
    mkdir: opts => fs.promises.mkdir(fileName, opts),
  });
};

export const makeBundleCache = (wr, cwd, readPowers, opts) => {
  const {
    toBundleName = n => `bundle-${n}.js`,
    toBundleMeta = n => `bundle-${n}-meta.json`,
  } = opts || {};

  const add = async (rootPath, targetName) => {
    const srcRd = cwd.neighbor(rootPath);

    const modTimeByPath = new Map();

    const loggedRead = async loc => {
      if (!loc.match(/\bpackage.json$/)) {
        try {
          const itemRd = cwd.neighbor(new URL(loc).pathname);
          const ref = srcRd.relative(itemRd.absolute());
          const { mtime } = await itemRd.stat();
          modTimeByPath.set(ref, mtime);
          // console.log({ loc, mtime, ref });
        } catch (oops) {
          console.error(oops);
        }
      }
      return readPowers.read(loc);
    };
    const bundle = await bundleSource(
      rootPath,
      {},
      { ...readPowers, read: loggedRead },
    );

    const { moduleFormat } = bundle;
    assert.equal(moduleFormat, 'endoZipBase64');

    const code = `export default ${JSON.stringify(bundle)};`;
    await wr.mkdir({ recursive: true });
    const bundleFileName = toBundleName(targetName);
    const bundleWr = wr.neighbor(bundleFileName);
    await bundleWr.writeText(code);
    const { mtime: bundleTime } = await bundleWr.readOnly().stat();

    const meta = {
      bundleFileName,
      bundleTime: bundleTime.toISOString(),
      moduleSource: {
        relative: bundleWr.readOnly().relative(srcRd.absolute()),
        absolute: srcRd.absolute(),
      },
      contents: [...modTimeByPath.entries()].map(([relativePath, mtime]) => ({
        relativePath,
        mtime: mtime.toISOString(),
      })),
    };

    await wr
      .neighbor(toBundleMeta(targetName))
      .writeText(JSON.stringify(meta, null, 2));
    return meta;
  };

  const validate = async (targetName, rootOpt) => {
    const metaRd = wr.readOnly().neighbor(toBundleMeta(targetName));
    let txt;
    try {
      txt = await metaRd.readText();
    } catch (ioErr) {
      assert.fail(
        X`${q(targetName)}: cannot read bundle metadata: ${q(ioErr)}`,
      );
    }
    const meta = JSON.parse(txt);
    const {
      bundleFileName,
      bundleTime,
      contents,
      moduleSource: { absolute: moduleSource },
    } = meta;
    assert.equal(bundleFileName, toBundleName(targetName));
    if (rootOpt) {
      assert.equal(
        moduleSource,
        cwd.neighbor(rootOpt).absolute(),
        X`bundle ${targetName} was for ${moduleSource}, not ${rootOpt}`,
      );
    }
    const { mtime: actualBundleTime } = await wr
      .readOnly()
      .neighbor(bundleFileName)
      .stat();
    assert.equal(actualBundleTime.toISOString(), bundleTime);
    const moduleRd = wr.readOnly().neighbor(moduleSource);
    const actualTimes = await Promise.all(
      contents.map(async ({ relativePath }) => {
        const itemRd = moduleRd.neighbor(relativePath);
        const { mtime } = await itemRd.stat();
        return { relativePath, mtime: mtime.toISOString() };
      }),
    );
    const outOfDate = actualTimes.filter(({ mtime }) => mtime > bundleTime);
    assert(
      outOfDate.length === 0,
      X`out of date: ${q(outOfDate)}. ${q(targetName)} bundled at ${q(
        bundleTime,
      )}`,
    );
    return meta;
  };

  const validateOrAdd = async (rootPath, targetName, log = console.debug) => {
    let meta;
    if (wr.readOnly().neighbor(toBundleMeta(targetName)).exists()) {
      try {
        meta = await validate(targetName, rootPath);
        const { bundleTime, contents } = meta;
        log(
          `${wr}`,
          toBundleName(targetName),
          'valid:',
          contents.length,
          'files bundled at',
          bundleTime,
        );
      } catch (invalid) {
        console.warn(invalid.message);
      }
    }
    if (!meta) {
      log(`${wr}`, 'add:', targetName, 'from', rootPath);
      meta = await add(rootPath, targetName);
      const { bundleFileName, bundleTime, contents } = meta;
      log(
        `${wr}`,
        'bundled',
        contents.length,
        'files in',
        bundleFileName,
        'at',
        bundleTime,
      );
    }
    return meta;
  };

  const loaded = new Map();
  const load = async (rootPath, targetName, log = console.debug) => {
    const found = loaded.get(targetName);
    // console.log('load', { targetName, found: !!found, rootPath });
    if (found && found.rootPath === rootPath) {
      return found.bundle;
    }
    const todo = makePromiseKit();
    loaded.set(targetName, { rootPath, bundle: todo.promise });
    const bundle = await validateOrAdd(rootPath, targetName, log)
      .then(({ bundleFileName }) =>
        import(`${wr.readOnly().neighbor(bundleFileName)}`),
      )
      .then(m => harden(m.default));
    assert.equal(bundle.moduleFormat, 'endoZipBase64');
    todo.resolve(bundle);
    return bundle;
  };

  return harden({
    add,
    validate,
    validateOrAdd,
    load,
  });
};

export const unsafeMakeBundleCache = async dest => {
  const [fs, path, url, crypto] = await Promise.all([
    await import('fs'),
    await import('path'),
    await import('url'),
    await import('crypto'),
  ]);

  const readPowers = makeReadPowers({ fs, url, crypto });
  const cwd = makeFileReader('', { fs, path });
  const destWr = makeFileWriter(dest, { fs, path });
  return makeBundleCache(destWr, cwd, readPowers);
};

export const makeNodeBundleCache = async (dest, loadModule) => {
  const [fs, path, url, crypto] = await Promise.all([
    await loadModule('fs'),
    await loadModule('path'),
    await loadModule('url'),
    await loadModule('crypto'),
  ]);

  const readPowers = makeReadPowers({ fs, url, crypto });
  const cwd = makeFileReader('', { fs, path });
  const destWr = makeFileWriter(dest, { fs, path });
  return makeBundleCache(destWr, cwd, readPowers);
};
