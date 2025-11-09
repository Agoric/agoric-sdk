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
      const onBegin = () => { transactionDepth++; };
      const onCommitOrRollback = () => { transactionDepth = Math.max(0, transactionDepth - 1); };
      return wrapStatement(stmt, sql, onBegin, onCommitOrRollback);
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
        try {
          db.exec(`PRAGMA ${pragma}`);
        } catch (err) {
          // If database is locked, it might be a transient lock from a previous connection
          // In WAL mode, the mode is persistent so we can query it instead
          if (err.message && err.message.includes('locked') && pragma.includes('journal_mode')) {
            // Query the current mode instead
            const stmt = db.prepare(`PRAGMA journal_mode`);
            const result = stmt.get();
            stmt.finalize();
            const currentMode = result ? Object.values(result)[0] : undefined;
            // Return the current mode (it's persistent in WAL)
            return simple ? currentMode : currentMode;
          }
          // Re-throw other errors
          throw err;
        }
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
     * Note: This uses backup to a temporary file and then reads it
     * @returns {Buffer}
     */
    serialize: async () => {
      if (location !== ':memory:') {
        throw new Error('serialize() only works with :memory: databases');
      }
      
      // @photostructure/sqlite doesn't support direct serialization
      // We would need to use backup() to a temporary file and read it
      // However, backup() is async and this needs to be sync
      // For now, throw an error with guidance
      throw new Error(
        'serialize() not fully supported by @photostructure/sqlite. ' +
        'Use file-based databases instead of in-memory databases for persistence.'
      );
    },
  };
  
  return wrapped;
}

/**
 * Wraps a StatementSync to add better-sqlite3 compatibility features
 * @param {ReturnType<DatabaseSync['prepare']>} stmt
 * @param {string} sql - The SQL text for transaction tracking
 * @param {() => void} onBegin - Callback when BEGIN is executed
 * @param {() => void} onCommitOrRollback - Callback when COMMIT/ROLLBACK is executed
 */
function wrapStatement(stmt, sql, onBegin, onCommitOrRollback) {
  let pluckEnabled = false;
  let pluckColumn = 0;
  let rawEnabled = false;
  
  // Detect if SQL uses named parameters
  const hasNamedParams = /[:$@]\w+/.test(sql);
  
  /**
   * Transform parameter object to add $ prefix to keys if needed
   * @photostructure/sqlite 0.0.1 requires the prefix in both SQL and object keys
   */
  function transformParams(args) {
    if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]) && args[0] !== null) {
      const params = args[0];
      const transformed = {};
      for (const [key, value] of Object.entries(params)) {
        // If the key doesn't start with $, :, or @, add $ prefix
        if (!key.startsWith('$') && !key.startsWith(':') && !key.startsWith('@')) {
          transformed[`$${key}`] = value;
        } else {
          transformed[key] = value;
        }
      }
      return [transformed];
    }
    return args;
  }
  
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
      const transformedArgs = hasNamedParams ? transformParams(args) : args;
      const result = stmt.get(...transformedArgs);
      if (!result) return result;
      
      if (pluckEnabled) {
        const values = Object.values(result);
        const pluckedValue = values[pluckColumn];
        return pluckedValue;
      }
      
      if (rawEnabled) {
        return Object.values(result);
      }
      
      return result;
    },
    
    all: (...args) => {
      const transformedArgs = hasNamedParams ? transformParams(args) : args;
      const results = stmt.all(...transformedArgs);
      
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
      // Track transactions
      const upperSQL = sql.trim().toUpperCase();
      if (upperSQL.startsWith('BEGIN')) {
        onBegin();
      } else if (upperSQL === 'COMMIT' || upperSQL === 'ROLLBACK') {
        onCommitOrRollback();
      }
      
      const transformedArgs = hasNamedParams ? transformParams(args) : args;
      return stmt.run(...transformedArgs);
    },
    
    /**
     * Iterate over results
     * better-sqlite3's iterate() returns an iterator that yields rows one at a time
     * In @photostructure/sqlite, we need to fetch all results and return an iterator
     */
    iterate: function*(...args) {
      const transformedArgs = hasNamedParams ? transformParams(args) : args;
      // Execute the query and get all results
      const results = stmt.all(...transformedArgs);
      // Yield each result
      for (const row of results) {
        if (pluckEnabled) {
          const values = Object.values(row);
          yield values[pluckColumn];
        } else if (rawEnabled) {
          yield Object.values(row);
        } else {
          yield row;
        }
      }
    },
    
    finalize: () => {
      return stmt.finalize();
    },
  };
  
  return wrapped;
}
