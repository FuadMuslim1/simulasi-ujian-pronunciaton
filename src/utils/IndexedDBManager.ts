const DB_NAME = 'VocalBoothDB';
const DB_VERSION = 1;
const RECORDINGS_STORE = 'recordings';

export interface RecordingData {
  sessionId: number;
  sessionNumber?: number;
  timestamp?: number;
  url: string;
  filename: string;
  blob: Blob;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create recordings store if it doesn't exist
        if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
          const objectStore = db.createObjectStore(RECORDINGS_STORE, { keyPath: 'sessionId' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });

        }
      };
    });
  }

  async saveRecording(recording: RecordingData): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RECORDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(RECORDINGS_STORE);
      
      const request = store.put(recording);

      request.onsuccess = () => {

        resolve();
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to save recording');
        reject(request.error);
      };
    });
  }

  async getRecording(sessionId: number): Promise<RecordingData | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RECORDINGS_STORE], 'readonly');
      const store = transaction.objectStore(RECORDINGS_STORE);
      const request = store.get(sessionId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get recording');
        reject(request.error);
      };
    });
  }

  async getAllRecordings(): Promise<RecordingData[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RECORDINGS_STORE], 'readonly');
      const store = transaction.objectStore(RECORDINGS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {

        resolve(request.result);
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to get all recordings');
        reject(request.error);
      };
    });
  }

  async deleteRecording(sessionId: number): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RECORDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(RECORDINGS_STORE);
      const request = store.delete(sessionId);

      request.onsuccess = () => {

        resolve();
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to delete recording');
        reject(request.error);
      };
    });
  }

  async clearAllRecordings(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RECORDINGS_STORE], 'readwrite');
      const store = transaction.objectStore(RECORDINGS_STORE);
      const request = store.clear();

      request.onsuccess = () => {

        resolve();
      };

      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to clear recordings');
        reject(request.error);
      };
    });
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;
      

      
      return { usage, quota, percentage };
    }
    
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

export const indexedDBManager = new IndexedDBManager();

