<template>
  <div class="flex items-center justify-center p-4">
    <div class="w-full">
      <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Backup</h1>

      <div class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <button @click="exportData" class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
            <ArrowDownIcon class="w-5 h-5 mr-2" />
            Export Data
          </button>
          <label for="file-upload" class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer transition-all duration-200">
            <ArrowUpIcon class="w-5 h-5 mr-2" />
            Import Data
          </label>
          <input id="file-upload" type="file" @change="importData" class="hidden" accept=".json" />
        </div>

        <div class="flex justify-between text-sm text-gray-700">
          <span>Local DB Size: {{ parseFloat(localDbSize).toFixed(2) }} KB</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-vue-next";

const localDbSize = ref(0);

async function exportData() {
  const data = await exportIndexedDBData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "T3VO_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = JSON.parse(e.target.result);
    await importDataToIndexedDB(data);
  };
  reader.readAsText(file);
}

async function exportIndexedDBData() {
  return new Promise((resolve, reject) => {
    const dbName = "T3VO";
    const request = indexedDB.open(dbName);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(db.objectStoreNames, "readonly");
      const exportData = {};
      transaction.oncomplete = () => resolve(exportData);
      transaction.onerror = () => reject("Failed to export data");

      Array.from(db.objectStoreNames).forEach((storeName) => {
        const store = transaction.objectStore(storeName);
        store.getAll().onsuccess = (event) => {
          exportData[storeName] = event.target.result;
        };
      });
    };
    request.onerror = () => reject("Failed to open IndexedDB");
  });
}

async function importDataToIndexedDB(data) {
  const dbName = "T3VO";
  const request = indexedDB.open(dbName);
  request.onsuccess = async (event) => {
    const db = event.target.result;
    const transaction = db.transaction(db.objectStoreNames, "readwrite");
    transaction.oncomplete = () => console.log("Data imported successfully");
    transaction.onerror = () => console.log("Failed to import data");

    for (const storeName of Object.keys(data)) {
      if (db.objectStoreNames.contains(storeName)) {
        const store = transaction.objectStore(storeName);
        for (const item of data[storeName]) {
          const getRequest = store.get(item.id);
          getRequest.onsuccess = (e) => {
            if (!e.target.result) {
              store.add(item);
            }
          };
        }
      }
    }
  };
}
</script>
