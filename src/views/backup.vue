<template>
  <div class="flex flex-col items-center p-4 space-y-6">
    <!-- Online Backup Section -->
    <div class="w-full p-4 border rounded-xl shadow-md">
      <h2 class="text-xl font-semibold mb-4">Online Backup</h2>
      <input v-model="key" placeholder="Enter or generate key" class="border p-2 rounded w-full" />
      <button @click="generateKey" class="bg-green-600 text-white p-3 rounded-xl w-full mt-2">Generate Key</button>
      <button @click="backupData" class="bg-blue-600 text-white p-3 rounded-xl w-full mt-2">Backup Data</button>
      <button @click="retrieveData" class="bg-gray-600 text-white p-3 rounded-xl w-full mt-2">Retrieve Data</button>
    </div>

    <!-- Offline Backup Section -->
    <div class="w-full p-4 border rounded-xl shadow-md">
      <h2 class="text-xl font-semibold mb-4">Offline Backup</h2>
      <button @click="exportData" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center">
        <ArrowDownIcon class="w-5 h-5 mr-2" />
        Export Data
      </button>
      <label for="file-upload" class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center cursor-pointer mt-2">
        <ArrowUpIcon class="w-5 h-5 mr-2" />
        Import Data
      </label>
      <input id="file-upload" type="file" @change="importData" class="hidden" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-vue-next";

const key = ref(localStorage.getItem("backup_key") || "");
const API_URL = "http://localhost:3000";

onMounted(() => {
  if (!key.value) generateKey();
});

function generateKey() {
  key.value = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  localStorage.setItem("backup_key", key.value);
}

async function backupData() {
  if (!key.value) return alert("Key is required");
  const data = await exportIndexedDBData();
  axios.post(`${API_URL}/save/${key.value}`, { data })
    .then(() => alert("Data backed up successfully"))
    .catch(() => alert("Failed to back up data"));
}

async function retrieveData() {
  if (!key.value) return alert("Key is required");
  axios.get(`${API_URL}/get/${key.value}`)
    .then(response => {
      const { data } = response.data;
      if (data) {
        importDataToIndexedDB(data);
        alert("Data restored successfully");
      } else {
        alert("No data found for this key");
      }
    })
    .catch(() => alert("Failed to retrieve data"));
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
      
      Array.from(db.objectStoreNames).forEach(storeName => {
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
    transaction.oncomplete = () => alert("Data imported successfully");
    transaction.onerror = () => alert("Failed to import data");
    
    Object.keys(data).forEach(storeName => {
      if (db.objectStoreNames.contains(storeName)) {
        const store = transaction.objectStore(storeName);
        data[storeName].forEach(item => store.add(item));
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
  alert("Data exported successfully");
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
