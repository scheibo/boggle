export class Storage<T> {
  private readonly store: Store<T>;
  private readonly cache: { [key: string]: T };

  static async create<T>(dbName: string, storeName: string) {
    const store = new Store<T>(dbName, storeName);
    const cache = await store.getAll();
    return new Storage<T>(store, cache);
  }

  private constructor(store: Store<T>, cache: { [key: string]: T }) {
    this.store = store;
    this.cache = cache;
  }

  get(key: string): T {
    return this.cache[key];
  }

  set(key: string, value: T): Promise<void> {
    const before = this.cache[key];
    this.cache[key] = value;
    return this.store.set(key, value).catch(e => {
      this.cache[key] = before;
      throw e;
    });
  }
}

class Store<T> {
  private readonly db: Promise<IDBDatabase>;

  constructor(dbName: string, readonly storeName: string) {
    this.db = new Promise((resolve, reject) => {
      const openreq = indexedDB.open(dbName, 1);
      openreq.onerror = () => reject(openreq.error);
      openreq.onsuccess = () => resolve(openreq.result);

      // First time setup: create an empty object store
      openreq.onupgradeneeded = () => {
        openreq.result.createObjectStore(storeName);
      };
    });
  }

  get(key: string): Promise<T> {
    let req: IDBRequest;
    return this.withIDBStore('readonly', store => {
      req = store.get(key);
    }).then(() => req.result);
  }

  set(key: string, value: T): Promise<void> {
    return this.withIDBStore('readwrite', store => {
      store.put(value, key);
    });
  }

  getAll(): Promise<{ [key: string]: T }> {
    const result: { [key: string]: T } = {};
    return this.withIDBStore('readonly', store => {
      // TODO error handling?
      store.openCursor().onsuccess = e => {
        // @ts-ignore
        const cursor = e.target.result;
        if (cursor) {
          result[cursor.primaryKey] = cursor.value;
          cursor.continue();
        }
      };
    }).then(() => result);
  }

  private withIDBStore(
    type: IDBTransactionMode,
    callback: (store: IDBObjectStore) => void
  ): Promise<void> {
    return this.db.then(
      db =>
        new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(this.storeName, type);
          transaction.oncomplete = () => resolve();
          transaction.onabort = transaction.onerror = () => reject(transaction.error);
          callback(transaction.objectStore(this.storeName));
        })
    );
  }
}
