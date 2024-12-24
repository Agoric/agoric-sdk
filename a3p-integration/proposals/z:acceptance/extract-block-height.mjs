import { existsSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const KEY = 'host.height';
const { Database } = sqlite3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @returns {Promise<string>}
 */
const main = async () => {
  const [, , rawFilePath] = process.argv;

  if (!(rawFilePath && existsSync(resolveFilePath(rawFilePath))))
    throw Error(`Invalid file path ${rawFilePath}`);

  const filePath = resolveFilePath(rawFilePath);

  const database = new Database(filePath, err => {
    if (err)
      throw Error(
        `Failed to open the database on path ${filePath} due to error: ${err.stack}`,
      );
  });

  return await new Promise((resolve, reject) =>
    database.get(
      'SELECT value FROM kvstore WHERE key = ?',
      [KEY],
      (err, row) => {
        if (err) reject(`Error fetching height: ${err.toString()}`);

        if (row) resolve(row.value);
        else reject(`No row matching key ${KEY}`);
      },
    ),
  ).finally(() =>
    database.close(err => {
      if (err) throw Error(`Error closing database: ${err.stack}`);
    }),
  );
};

/**
 * @param {string} filePath
 */
const resolveFilePath = filePath =>
  isAbsolute(filePath) ? filePath : resolve(__dirname, filePath);

main()
  .then(height => console.log(height))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
