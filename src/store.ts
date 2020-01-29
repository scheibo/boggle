class Store {
  private readonly db: Promise<IDBDatabase>;

  constructor(dbName: = 'keyval', readonly storeName = 'keyval') {
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

  get<T>(key: string): Promise<T> {
    let req: IDBRequest;
    return this.withIDBStore('readonly', store => {
      req = store.get(key);
    }).then(() => req.result);
  }

  set<T>(key: string, value: T): Promise<void> {
    return this.withIDBStore('readwrite', store => {
      store.put(value, key);
    });
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
