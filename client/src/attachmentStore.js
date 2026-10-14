const DATABASE_NAME = "shadow-ai-attachments";
const STORE_NAME = "files";
const DATABASE_VERSION = 1;
const previewUrls = new Map();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local attachment storage."));
  });
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(result?.result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not access local attachment storage."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Local attachment storage was interrupted."));
    };
  });
}

export async function saveAttachment(id, file) {
  const storedFile = new Blob([await file.arrayBuffer()], { type: file.type });
  return withStore("readwrite", (store) => store.put({ id, file: storedFile }));
}

export function getAttachment(id) {
  return withStore("readonly", (store) => store.get(id));
}

export function getAttachmentPreviewUrl(id, file) {
  if (!previewUrls.has(id)) previewUrls.set(id, URL.createObjectURL(file));
  return previewUrls.get(id);
}

export function releaseAttachmentPreviews(ids) {
  for (const id of ids) {
    const previewUrl = previewUrls.get(id);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrls.delete(id);
    }
  }
}

export function removeAttachments(ids) {
  if (!ids.length) return Promise.resolve();
  releaseAttachmentPreviews(ids);
  return withStore("readwrite", (store) => {
    for (const id of ids) store.delete(id);
  });
}
