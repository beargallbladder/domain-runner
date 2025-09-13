import { IAPIKeyManager } from './interfaces';
import { Logger } from '../../utils/logger';

export class APIKeyManager implements IAPIKeyManager {
  private keyPools: Map<string, {
    keys: string[];
    currentIndex: number;
    failedKeys: Set<string>;
  }> = new Map();

  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  addKeys(provider: string, keys: string[]): void {
    const validKeys = keys.filter(key => key && key.trim());
    
    if (validKeys.length === 0) {
      this.logger.warn(`No valid keys provided for ${provider}`);
      return;
    }

    if (!this.keyPools.has(provider)) {
      this.keyPools.set(provider, {
        keys: validKeys,
        currentIndex: 0,
        failedKeys: new Set()
      });
    } else {
      const pool = this.keyPools.get(provider)!;
      pool.keys.push(...validKeys);
    }

    this.logger.info(`Added ${validKeys.length} keys for ${provider}`);
  }

  getNextKey(provider: string): string | null {
    const pool = this.keyPools.get(provider);
    
    if (!pool || pool.keys.length === 0) {
      return null;
    }

    // Find next non-failed key
    let attempts = 0;
    while (attempts < pool.keys.length) {
      const key = pool.keys[pool.currentIndex];
      
      if (!pool.failedKeys.has(key)) {
        // Rotate for next call
        this.rotateKey(provider);
        return key;
      }

      this.rotateKey(provider);
      attempts++;
    }

    // All keys have failed
    this.logger.error(`All keys for ${provider} have failed`);
    return null;
  }

  removeKey(provider: string, key: string): void {
    const pool = this.keyPools.get(provider);
    
    if (!pool) return;

    pool.failedKeys.add(key);
    this.logger.warn(`Marked key as failed for ${provider}`);
  }

  getKeyCount(provider: string): number {
    const pool = this.keyPools.get(provider);
    
    if (!pool) return 0;

    return pool.keys.length - pool.failedKeys.size;
  }

  rotateKey(provider: string): void {
    const pool = this.keyPools.get(provider);
    
    if (!pool) return;

    pool.currentIndex = (pool.currentIndex + 1) % pool.keys.length;
  }

  resetFailedKeys(provider: string): void {
    const pool = this.keyPools.get(provider);
    
    if (!pool) return;

    pool.failedKeys.clear();
    this.logger.info(`Reset failed keys for ${provider}`);
  }

  getProviderStatus(provider: string): {
    totalKeys: number;
    activeKeys: number;
    failedKeys: number;
  } | null {
    const pool = this.keyPools.get(provider);
    
    if (!pool) return null;

    return {
      totalKeys: pool.keys.length,
      activeKeys: pool.keys.length - pool.failedKeys.size,
      failedKeys: pool.failedKeys.size
    };
  }
}