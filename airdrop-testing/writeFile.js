import fs from 'fs';
import path from 'path';

/**
 * Writes data to a file in the current working directory.
 *
 * @param {string} filename - The name of the file to write to.
 * @param {any} data - The data to write to the file. Can be of any structure.
 * @returns {Promise<void>} - A promise that resolves when the file has been written.
 */
async function writeFile(filename, data) {
  // Resolve the full path to the file
  const filePath = path.join(process.cwd(), filename);

  // Convert data to a string representation
  const dataString =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  // Write the data to the file
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, dataString, 'utf8', err => {
      if (err) {
        console.error(`Failed to write to file ${filename}:`, err);
        return reject(err);
      }
      console.log(`Successfully wrote to file ${filename}`);
      resolve(dataString);
    });
  });
}

export { writeFile };
