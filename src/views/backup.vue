<template>
  <div class="flex items-center justify-center p-4">
    <div class="w-full max-w-4xl bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg p-8 space-y-8 transition-all duration-300 ease-in-out hover:shadow-xl">
      <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Sync & Backup</h1>

      <div class="space-y-6">
        <div class="relative">
          <label for="key" class="block text-sm font-medium text-gray-700 mb-1">Backup Key</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <input v-model="key" id="key" type="text" placeholder="Enter or generate key" class="focus:ring-purple-500 focus:border-purple-500 block w-full pl-3 pr-24 sm:text-sm border-gray-300 rounded-md transition-all duration-200" :class="{ 'pr-24': !key, 'pr-12': key }" />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <button @click="syncData" class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200">
            <RefreshCwIcon class="w-5 h-5 mr-2" />
            Sync Data
          </button>
        </div>

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
          <span>Local DB Size: {{ localDbSize }} KB</span>
          <span>Remote DB Size: {{ remoteDbSize }} KB</span>
        </div>

        <transition name="fade">
          <div v-if="logMessages.length" class="bg-gray-50 p-4 rounded-md overflow-hidden">
            <h2 class="text-md font-semibold text-gray-800 mb-2">Sync Log</h2>
            <div class="max-h-40 overflow-y-auto">
              <ul class="text-sm text-gray-600 space-y-1">
                <li v-for="(msg, index) in logMessages" :key="index" class="transition-all duration-300 ease-in-out" :class="{ 'opacity-0 translate-y-2': index === logMessages.length - 1 }">
                  {{ msg }}
                </li>
              </ul>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { RefreshCwIcon, ArrowDownIcon, ArrowUpIcon } from "lucide-vue-next";
import CryptoJS from "crypto-js";

function encryptContent(content) {
  return CryptoJS.AES.encrypt(JSON.stringify(content), key.value.split("-t3vo-")[1]).toString();
}

function decryptContent(encryptedContent) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, key.value.split("-t3vo-")[1]);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    console.error("Decryption error:", e);
    return null;
  }
}

const key = ref(localStorage.getItem("backup_key") || null);
const API_URL = "https://sh.t3vo.com";
const localDbSize = ref(0);
const remoteDbSize = ref(0);
const logMessages = ref([]);

function log(message) {
  logMessages.value.push(message);
}

if (!key.value) {
  generateKey();
}

function generateKey() {
  function randomString(length) {
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
      .map(b => b.toString(36).padStart(2, "0"))
      .join("")
      .substring(0, length);
  }

  key.value = `${randomString(10)}-t3vo-${randomString(16)}`;
  localStorage.setItem("backup_key", key.value);
}



async function syncData() {
  logMessages.value = ["Starting sync..."];
  if (!key.value) return log("Error: Key is required");

  const backupid = key.value.split("-t3vo-")[0];

  try {
    log("Fetching remote data...");
    const response = await axios.get(`${API_URL}/get/${backupid}`);
    let remoteData = response.data?.data || "";

    if (remoteData) {
      remoteData = decryptContent(remoteData);
      if (!remoteData) return log("Error: Decryption failed");
    }

    remoteDbSize.value = JSON.stringify(remoteData).length / 1024;

    log("Merging remote data into local database...");
    await importDataToIndexedDB(remoteData);

    log("Calculating local database size...");
    const localData = await exportIndexedDBData();
    localDbSize.value = JSON.stringify(localData).length / 1024;

    log("Encrypting local data...");
    const encryptedData = encryptContent(localData);

    log("Uploading encrypted database to remote...");
    await axios.post(`${API_URL}/save/${backupid}`, { data: encryptedData });

    log("Sync completed successfully!");
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log("No remote data found, uploading local database...");
      const localData = await exportIndexedDBData();
      const encryptedData = encryptContent(localData);
      await axios.post(`${API_URL}/save/${backupid}`, { data: encryptedData });
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
