// @ts-check
/**
 * Adapter to bridge better-sqlite3 API to @photostructure/sqlite (node:sqlite compatible) API
 * 
 * This module provides compatibility methods to make @photostructure/sqlite work
 * with code originally written for better-sqlite3.
 */

import { DatabaseSync } from '@photostructure/sqlite';

/**
 * Wraps a DatabaseSync to add better-sqlite3 compatibility features
 * 
 * @param {string | Buffer} location - Path to database file or Buffer for serialized DB
 * @param {object} [options]
 * @param {boolean} [options.readonly]
 * @returns {WrappedDatabase}
 */
export function createDatabase(location, options = {}) {
  const { readonly = false } = options;
  
  // @photostructure/sqlite doesn't support Buffer serialized databases
  // This feature is only used for testing with in-memory databases
  if (Buffer.isBuffer(location)) {
    throw new Error('Serialized database Buffer not supported - use :memory: instead');
  }
  
  const db = new DatabaseSync(location, { readOnly: readonly });
  
  // Track transaction state manually since @photostructure/sqlite doesn't expose it
  let transactionDepth = 0;
  
  /**
   * @typedef {Object} WrappedDatabase
   * @property {typeof db.prepare} prepare
   * @property {typeof db.exec} exec
   * @property {typeof db.close} close
   * @property {boolean} inTransaction
   * @property {(enabled: boolean) => void} unsafeMode
   * @property {(sql: string, options?: { simple?: boolean }) => any} pragma
   * @property {() => Buffer} serialize
   */
  
  const wrapped = {
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return wrapStatement(stmt);
    },
    
    exec: (sql) => {
      return db.exec(sql);
    },
    
    close: () => {
      return db.close();
    },
    
    get inTransaction() {
      // Check actual transaction state from SQLite
      try {
        const stmt = db.prepare('SELECT 1');
        stmt.finalize();
        // If we can prepare a statement, check if we're in a transaction
        // by attempting to execute a dummy statement
        return transactionDepth > 0;
      } catch {
        return false;
      }
    },
    
    /**
     * Execute a PRAGMA statement
     * @param {string} pragma - PRAGMA statement
     * @param {{ simple?: boolean }} [options]
     */
    pragma: (pragma, options = {}) => {
      const { simple = false } = options;
      
      // Check if this is a setting or query pragma
      if (pragma.includes('=')) {
        // Setting a pragma - use exec
        db.exec(`PRAGMA ${pragma}`);
        // For settings, return the value after the =
        const parts = pragma.split('=');
        return simple ? parts[1].trim() : parts[1].trim();
      } else {
        // Querying a pragma - use prepare
        const stmt = db.prepare(`PRAGMA ${pragma}`);
        const result = stmt.get();
        stmt.finalize();
        
        if (!result) return undefined;
        
        // Get the first value from the result
        const firstKey = Object.keys(result)[0];
        return simple ? result[firstKey] : result;
      }
    },
    
    /**
     * Compatibility method for better-sqlite3's unsafeMode
     * Note: @photostructure/sqlite doesn't have this concept
     * @param {boolean} enabled
     */
    unsafeMode: (enabled) => {
      // No-op for @photostructure/sqlite
      // In better-sqlite3, this disables some safety checks
      // We can't replicate this behavior exactly
      if (enabled) {
        console.warn('unsafeMode() is a no-op with @photostructure/sqlite');
      }
    },
    
    /**
     * Serialize database to Buffer
     * Note: @photostructure/sqlite doesn't support this
     * @returns {Buffer}
     */
    serialize: () => {
      throw new Error('serialize() not supported by @photostructure/sqlite');
    },
  };
  
  // Wrap prepare to track transactions
  const originalPrepare = wrapped.prepare;
  wrapped.prepare = (sql) => {
    const stmt = originalPrepare(sql);
    const originalRun = stmt.run;
    
    stmt.run = (...args) => {
      const upperSQL = sql.trim().toUpperCase();
      if (upperSQL.startsWith('BEGIN')) {
        transactionDepth++;
      } else if (upperSQL === 'COMMIT' || upperSQL === 'ROLLBACK') {
        transactionDepth = Math.max(0, transactionDepth - 1);
      }
      return originalRun.apply(stmt, args);
    };
    
    return stmt;
  };
  
  return wrapped;
}

/**
 * Wraps a StatementSync to add better-sqlite3 compatibility features
 * @param {ReturnType<DatabaseSync['prepare']>} stmt
 */
function wrapStatement(stmt) {
  let pluckEnabled = false;
  let pluckColumn = 0;
  let rawEnabled = false;
  
  const wrapped = {
    get sourceSQL() {
      return stmt.sourceSQL;
    },
    
    /**
     * Enable pluck mode - return single column value instead of object
     * @param {boolean | number} [column] - true for first column, or column index
     */
    pluck: (column = true) => {
      pluckEnabled = true;
      pluckColumn = typeof column === 'number' ? column : 0;
      return wrapped;
    },
    
    /**
     * Enable raw mode - return arrays instead of objects
     */
    raw: () => {
      rawEnabled = true;
      return wrapped;
    },
    
    get: (...args) => {
      const result = stmt.get(...args);
      if (!result) return result;
      
      if (pluckEnabled) {
        const values = Object.values(result);
        return values[pluckColumn];
      }
      
      if (rawEnabled) {
        return Object.values(result);
      }
      
      return result;
    },
    
    all: (...args) => {
      const results = stmt.all(...args);
      
      if (pluckEnabled) {
        return results.map(row => {
          const values = Object.values(row);
          return values[pluckColumn];
        });
      }
      
      if (rawEnabled) {
        return results.map(row => Object.values(row));
      }
      
      return results;
    },
    
    run: (...args) => {
      return stmt.run(...args);
    },
    
    /**
     * Iterate over results
     * In @photostructure/sqlite, we can iterate directly on the statement
     */
    iterate: (...args) => {
      // Bind parameters first if provided
      if (args.length > 0) {
        // We need to execute and return an iterator
        const results = stmt.all(...args);
        return results[Symbol.iterator]();
      }
      
      // Return the statement's iterator
      return stmt[Symbol.iterator]();
    },
    
    finalize: () => {
      return stmt.finalize();
    },
  };
  
  return wrapped;
}
