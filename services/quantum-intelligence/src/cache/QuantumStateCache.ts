export class QuantumStateCache {
  private cache: Map<string, { data: any; expires: number }>;
  private ttlSeconds: number;

  constructor(ttlSeconds: number) {
    this.cache = new Map();
    this.ttlSeconds = ttlSeconds;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, data: any): Promise<void> {
    const expires = Date.now() + (this.ttlSeconds * 1000);
    this.cache.set(key, { data, expires });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}