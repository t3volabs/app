<template>
  <div class="flex items-center justify-center p-4">
    <div class="">
      <div class="space-y-6">
        <div>
          <label for="key" class="block text-sm font-medium text-gray-700">Backup Key</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <input v-model="key" id="key" type="text" placeholder="Enter or generate key" class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md" />
            <button @click="generateKey" class="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-100 hover:bg-gray-200 rounded-r-md text-sm text-gray-600">Generate</button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <button @click="syncData" class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
            <RefreshCwIcon class="w-5 h-5 mr-2" />
            Sync Data
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button @click="exportData" class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <ArrowDownIcon class="w-5 h-5 mr-2" />
            Export Data
          </button>
          <label for="file-upload" class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer">
            <ArrowUpIcon class="w-5 h-5 mr-2" />
            Import Data
          </label>
          <input id="file-upload" type="file" @change="importData" class="hidden" />
        </div>

        <div class="text-sm text-gray-700">Local DB Size: {{ localDbSize }} KB</div>
        <div class="text-sm text-gray-700">Remote DB Size: {{ remoteDbSize }} KB</div>

        <div v-if="logMessages.length" class="bg-gray-50 p-4 rounded-md">
          <h2 class="text-md font-semibold text-gray-800">Sync Log</h2>
          <ul class="text-sm text-gray-600 mt-2">
            <li v-for="(msg, index) in logMessages" :key="index">{{ msg }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { RefreshCwIcon, ArrowDownIcon, ArrowUpIcon } from "lucide-vue-next";

const key = ref(localStorage.getItem("backup_key") || "");
const API_URL = "https://sh.t3vo.com";
const localDbSize = ref(0);
const remoteDbSize = ref(0);
const logMessages = ref([]);

function log(message) {
  logMessages.value.push(message);
}

function generateKey() {
  key.value = Math.random().toString(36).substring(2, 12) + "t3vo" + Math.random().toString(36).substring(2, 12);
  localStorage.setItem("backup_key", key.value);
}

async function syncData() {
  logMessages.value = ["Starting sync..."];
  if (!key.value) return log("Error: Key is required");

  try {
    log("Fetching remote data...");
    const response = await axios.get(`${API_URL}/get/${key.value}`);
    const remoteData = response.data?.data || {};
    remoteDbSize.value = JSON.stringify(remoteData).length / 1024;

    log("Merging remote data into local database...");
    await importDataToIndexedDB(remoteData);

    log("Calculating local database size...");
    const localData = await exportIndexedDBData();
    localDbSize.value = JSON.stringify(localData).length / 1024;

    log("Uploading local database to remote...");
    await axios.post(`${API_URL}/save/${key.value}`, { data: localData });

    log("Sync completed successfully!");
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log("No remote data found, uploading local database...");
      const localData = await exportIndexedDBData();
      await axios.post(`${API_URL}/save/${key.value}`, { data: localData });
      log("Sync completed successfully!");
    } else {
      log("Sync failed: " + error.message);
    }
  }
}

async function exportData() {
  const data = await exportIndexedDBData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "T3VO_backup.json";
  a.click();
  URL.revokeObjectURL(url);
  log("Data exported successfully");
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = JSON.parse(e.target.result);
    await importDataToIndexedDB(data);
    log("Data imported successfully");
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
    transaction.oncomplete = () => log("Data imported successfully");
    transaction.onerror = () => log("Failed to import data");

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
