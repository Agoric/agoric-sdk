import test from 'ava';
import { makeFile } from '@agoric/fast-usdc/src/cli/util/file.js';

const makeReadMock = (content: string) => {
  let filePathRead: string;
  let encodingUsed: string;
  const readFile = (filePath: string, encoding: string) => {
    filePathRead = filePath;
    encodingUsed = encoding;
    return content;
  };
  return {
    getFilePathRead: () => filePathRead,
    getEncodingUsed: () => encodingUsed,
    readFile,
  };
};

const makeExistsMock = (exists: boolean) => {
  let filePathRead: string;
  const pathExists = (filePath: string) => {
    filePathRead = filePath;
    return exists;
  };
  return {
    getFilePathRead: () => filePathRead,
    pathExists,
  };
};

const makeWriteMock = () => {
  let filePathWritten: string;
  let contentsWritten: string;
  const writeFile = (filePath: string, contents: string) => {
    filePathWritten = filePath;
    contentsWritten = contents;
  };
  return {
    getFilePathWritten: () => filePathWritten,
    getContentsWritten: () => contentsWritten,
    writeFile,
  };
};

const makeMkdirMock = () => {
  let dirPathMade: string;
  const mkdir = (dirPath: string) => {
    dirPathMade = dirPath;
  };
  return {
    getDirPathMade: () => dirPathMade,
    mkdir,
  };
};

test('returns the path', t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const file = makeFile(path);

  t.is(file.path, path);
});

test('reads the file contents', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const content = 'foo';
  const readMock = makeReadMock(content);
  // @ts-expect-error mocking readFile
  const file = makeFile(path, readMock.readFile);

  const result = await file.read();
  t.is(result, content);
  t.is(readMock.getEncodingUsed(), 'utf-8');
  t.is(readMock.getFilePathRead(), path);
});

test('can tell whether the file exists', t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const mock1 = makeExistsMock(false);
  const mock2 = makeExistsMock(true);
  const file1 = makeFile(
    path,
    // @ts-expect-error mocking
    undefined,
    undefined,
    undefined,
    mock1.pathExists,
  );
  const file2 = makeFile(
    path,
    // @ts-expect-error mocking
    undefined,
    undefined,
    undefined,
    mock2.pathExists,
  );

  const res1 = file1.exists();
  const res2 = file2.exists();

  t.is(res1, false);
  t.is(mock1.getFilePathRead(), path);
  t.is(res2, true);
  t.is(mock2.getFilePathRead(), path);
});

test('writes the file if the directory exists', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  const mockExists = makeExistsMock(true);
  const mockWrite = makeWriteMock();
  const file = makeFile(
    path,
    // @ts-expect-error mocking
    undefined,
    mockWrite.writeFile,
    undefined,
    mockExists.pathExists,
  );

  await file.write('foo');

  t.is(mockExists.getFilePathRead(), dir);
  t.is(mockWrite.getContentsWritten(), 'foo');
  t.is(mockWrite.getFilePathWritten(), path);
});

test('creates the directory if it does not exist', async t => {
  const dir = 'config/dir/.fast-usdc';
  const path = `${dir}/config.json`;
  const mockExists = makeExistsMock(false);
  const mockWrite = makeWriteMock();
  const mockMkdir = makeMkdirMock();
  const file = makeFile(
    path,
    // @ts-expect-error mocking
    undefined,
    mockWrite.writeFile,
    mockMkdir.mkdir,
    mockExists.pathExists,
  );

  await file.write('foo');

  t.is(mockExists.getFilePathRead(), dir);
  t.is(mockMkdir.getDirPathMade(), dir);
  t.is(mockWrite.getContentsWritten(), 'foo');
  t.is(mockWrite.getFilePathWritten(), path);
});
