<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
      <h1 class="text-3xl font-semibold text-center text-gray-900">Data Backup</h1>
      
      <div class="space-y-6">
        <div>
          <label for="key" class="block text-sm font-medium text-gray-700">Backup Key</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <input
              v-model="key"
              id="key"
              type="text"
              placeholder="Enter or generate key"
              class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
            />
            <button
              @click="generateKey"
              class="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-100 hover:bg-gray-200 rounded-r-md text-sm text-gray-600"
            >
              Generate
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button
            @click="backupData"
            class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <CloudIcon class="w-5 h-5 mr-2" />
            Backup Data
          </button>
          <button
            @click="retrieveData"
            class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <DownloadCloudIcon class="w-5 h-5 mr-2" />
            Retrieve Data
          </button>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Offline Backup</h2>
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="exportData"
              class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownIcon class="w-5 h-5 mr-2" />
              Export Data
            </button>
            <label
              for="file-upload"
              class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
            >
              <ArrowUpIcon class="w-5 h-5 mr-2" />
              Import Data
            </label>
            <input id="file-upload" type="file" @change="importData" class="hidden" />
          </div>
        </div>

        <div v-if="errorMessage" class="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <AlertCircleIcon class="h-5 w-5 text-red-400" />
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ errorMessage }}</p>
            </div>
          </div>
        </div>

        <div v-if="successMessage" class="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <CheckCircleIcon class="h-5 w-5 text-green-400" />
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">{{ successMessage }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { ArrowDownIcon, ArrowUpIcon, CloudIcon, DownloadCloudIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-vue-next";

const key = ref(localStorage.getItem("backup_key") || "");
const API_URL = "https://sh.t3vo.com";
const errorMessage = ref("");
const successMessage = ref("");

onMounted(() => {
  if (!key.value) generateKey();
});

function generateKey() {
  key.value = Math.random().toString(36).substring(2, 12) + "t3vo" + Math.random().toString(36).substring(2, 12);
  localStorage.setItem("backup_key", key.value);
}

function showError(message) {
  errorMessage.value = message;
  setTimeout(() => {
    errorMessage.value = "";
  }, 5000);
}

function showSuccess(message) {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = "";
  }, 5000);
}

async function backupData() {
  if (!key.value) return showError("Key is required");
  const data = await exportIndexedDBData();
  axios
    .post(`${API_URL}/save/${key.value}`, { data })
    .then(() => showSuccess("Data backed up successfully"))
    .catch(() => showError("Failed to back up data"));
}

async function retrieveData() {
  if (!key.value) return showError("Key is required");
  axios
    .get(`${API_URL}/get/${key.value}`)
    .then((response) => {
      const { data } = response.data;
      if (data) {
        importDataToIndexedDB(data);
        showSuccess("Data restored successfully");
      } else {
        showError("No data found for this key");
      }
    })
    .catch(() => showError("Failed to retrieve data"));
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
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(db.objectStoreNames, "readwrite");
    transaction.oncomplete = () => showSuccess("Data imported successfully");
    transaction.onerror = () => showError("Failed to import data");

    Object.keys(data).forEach((storeName) => {
      if (db.objectStoreNames.contains(storeName)) {
        const store = transaction.objectStore(storeName);
        data[storeName].forEach((item) => store.add(item));
      }
    });
  };
}

const exportData = async () => {
  const data = await exportIndexedDBData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "T3VO_backup.json";
  a.click();
  URL.revokeObjectURL(url);
  showSuccess("Data exported successfully");
};

const importData = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = JSON.parse(e.target.result);
    await importDataToIndexedDB(data);
  };
  reader.readAsText(file);
};
</script>