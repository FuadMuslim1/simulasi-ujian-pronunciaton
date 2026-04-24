export class StorageManager {
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`vocalBooth${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`❌ StorageManager: Error getting ${key}:`, error);
      return null;
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`vocalBooth${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ StorageManager: Error setting ${key}:`, error);
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(`vocalBooth${key}`);
    } catch (error) {
      console.error(`❌ StorageManager: Error removing ${key}:`, error);
    }
  }
}

