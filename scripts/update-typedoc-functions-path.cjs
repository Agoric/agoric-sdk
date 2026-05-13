#!/usr/bin/env node
/* eslint-env node */

/**
 * Help us workaround a limitation in Cloudflare Pages that prevents us from
 * publishing static files to a top-level `/functions` directory. (Cloudflare
 * reserves this namespace for Worker Functions as of
 * https://github.com/cloudflare/workers-sdk/pull/2103).
 *
 * This script -
 * 1. renames `/functions` directory to `/funcs`
 * 2. updates generated urls in html files to reference new url path
 * 3. updates base64 encoded navigation and search data to reference new url path
 *
 * See https://github.com/TypeStrong/typedoc/issues/2111 for more solutions
 * on how to workaround this.
 *
 * See https://github.com/Agoric/agoric-sdk/issues/9729 for tracking of the
 * issue in this project. If a different solution is arrived at, we can remove
 * this file and the accompanying `yarn docs:update-functions-path`.
 */

const fsp = require('node:fs').promises;
const path = require('node:path');
const zlib = require('node:zlib');
const process = require('node:process');

const dataUriPrefix = 'data:application/octet-stream;base64,';

const config = {
  oldDirName: 'functions',
  newDirName: 'funcs',
  apiDocsDir: path.join(__dirname, '..', 'api-docs'),
  dataFiles: [
    {
      path: path.join(__dirname, '..', 'api-docs', 'assets', 'navigation.js'),
      windowKey: 'navigationData',
    },
    {
      path: path.join(__dirname, '..', 'api-docs', 'assets', 'search.js'),
      windowKey: 'searchData',
    },
  ],
};

function zlibAsync(operation, buffer, errorLabel) {
  return new Promise((resolve, reject) => {
    operation(buffer, (err, data) => {
      if (err) {
        reject(new Error(`Failed to ${errorLabel} data: ${err.message}`));
        return;
      }
      resolve(data);
    });
  });
}

function getTypeDocDataFormat(encodedData) {
  return encodedData.startsWith(dataUriPrefix)
    ? 'gzip-data-uri'
    : 'deflate-base64';
}

// Decodes and decompresses the TypeDoc data
async function decodeTypeDocData(encodedData) {
  const format = getTypeDocDataFormat(encodedData);
  const base64Data =
    format === 'gzip-data-uri'
      ? encodedData.slice(dataUriPrefix.length)
      : encodedData;
  const buffer = Buffer.from(base64Data, 'base64');
  const operation = format === 'gzip-data-uri' ? zlib.gunzip : zlib.inflate;
  const decompressed = await zlibAsync(operation, buffer, 'decompress');

  try {
    return {
      data: JSON.parse(decompressed.toString('utf-8')),
      format,
    };
  } catch (parseError) {
    throw new Error(`Failed to parse JSON: ${parseError.message}`);
  }
}

// Compresses and encodes the TypeDoc data
async function encodeTypeDocData(jsonData, format) {
  const jsonString = JSON.stringify(jsonData);
  const operation = format === 'gzip-data-uri' ? zlib.gzip : zlib.deflate;
  const compressed = await zlibAsync(
    operation,
    Buffer.from(jsonString),
    'compress',
  );
  const base64Data = compressed.toString('base64');

  return format === 'gzip-data-uri'
    ? `${dataUriPrefix}${base64Data}`
    : base64Data;
}

// Recursively updates URLs in the data
function updateUrls(data, searchString, replaceString) {
  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (
        typeof data[key] === 'string' &&
        data[key].includes(`${searchString}/`)
      ) {
        data[key] = data[key].replace(
          new RegExp(`${searchString}/`, 'g'),
          `${replaceString}/`,
        );
      } else if (typeof data[key] === 'object') {
        updateUrls(data[key], searchString, replaceString);
      }
    }
  }
  return data;
}

// Updates js-based data file (navigation or search)
async function updateDataFile(filePath, windowKey) {
  const fileContent = await fsp.readFile(filePath, 'utf8');
  const match = fileContent.match(
    new RegExp(`window\\.${windowKey} = "(.*?)"`),
  );
  if (!match) {
    throw new Error(`${windowKey} data not found in file`);
  }
  const encodedData = match[1];

  const { data: decodedData, format } = await decodeTypeDocData(encodedData);
  const updatedData = updateUrls(
    decodedData,
    config.oldDirName,
    config.newDirName,
  );
  const newEncodedData = await encodeTypeDocData(updatedData, format);
  const newFileContent = `window.${windowKey} = "${newEncodedData}"`;
  await fsp.writeFile(filePath, newFileContent);
  console.log(`${windowKey} updated successfully`);
}

/**
 * Updates files in a directory
 * @param {string} dir - Directory to update
 * @param {string} fileExtension - File extension to process
 * @param {(content: string) => string} updateFunction - Function to update file content
 */
async function updateFiles(dir, fileExtension, updateFunction) {
  const files = await fsp.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      if (file === config.oldDirName) {
        const newPath = path.join(dir, config.newDirName);
        await fsp.rename(filePath, newPath);
        console.log(`Renamed directory: ${filePath} to ${newPath}`);
        await updateFiles(newPath, fileExtension, updateFunction);
      } else {
        await updateFiles(filePath, fileExtension, updateFunction);
      }
    } else if (path.extname(file) === fileExtension) {
      const content = await fsp.readFile(filePath, 'utf8');
      const updatedContent = updateFunction(content);
      if (content !== updatedContent) {
        await fsp.writeFile(filePath, updatedContent);
        console.log(`Updated: ${filePath}`);
      }
    }
  }
}

/**
 * Updates content in HTML files
 * @param {string} content - The HTML content to update
 * @returns {string} - The updated HTML content
 */
function updateHtmlContentLinks(content) {
  return content.replace(
    new RegExp(`/${config.oldDirName}/`, 'g'),
    `/${config.newDirName}/`,
  );
}

/**
 * Main function to run the script
 */
async function main() {
  await updateFiles(config.apiDocsDir, '.html', updateHtmlContentLinks);
  for (const dataFile of config.dataFiles) {
    await updateDataFile(dataFile.path, dataFile.windowKey);
  }
}

module.exports = {
  decodeTypeDocData,
  encodeTypeDocData,
  updateHtmlContentLinks,
  updateUrls,
};

if (require.main === module) {
  main().catch(e => {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  });
}
