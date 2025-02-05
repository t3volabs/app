<template>
    <div class="p-8">
      <h1 class="text-4xl font-extrabold text-gray-800 mb-8 text-center">Backup <span class="text-blue-600">Manager</span></h1>

      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button @click="exportData" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out overflow-hidden">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <ArrowDownIcon class="h-5 w-5 text-blue-500 group-hover:text-blue-400 transition-all duration-300 ease-in-out" />
            </span>
            <span class="ml-4">Export Data</span>
          </button>

          <label for="file-upload" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer transition-all duration-300 ease-in-out overflow-hidden">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <ArrowUpIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-300 transition-all duration-300 ease-in-out" />
            </span>
            <span class="ml-4">Import Data</span>
          </label>
          <input id="file-upload" type="file" @change="importData" class="hidden" accept=".json" />
        </div>

        <div class="mt-6 bg-gray-100 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700">Local DB Size</span>
            <span class="text-lg font-bold text-blue-600">{{ parseFloat(localDbSize).toFixed(2) }} KB</span>
          </div>
          <div class="mt-2 w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" :style="{ width: `${Math.min((localDbSize / 1000) * 100, 100)}%` }"></div>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showNotification" class="mt-6 p-4 bg-green-100 rounded-md">
          <p class="text-green-700 text-center">{{ notificationMessage }}</p>
        </div>
      </transition>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-vue-next";

const localDbSize = ref(0);
const showNotification = ref(false);
const notificationMessage = ref("");

async function exportData() {
  try {
    const data = await exportIndexedDBData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "T3VO_backup.json";
    a.click();
    URL.revokeObjectURL(url);
    showNotification.value = true;
    notificationMessage.value = "Data exported successfully!";
    setTimeout(() => {
      showNotification.value = false;
    }, 3000);
  } catch (error) {
    console.error("Export failed:", error);
    showNotification.value = true;
    notificationMessage.value = "Export failed. Please try again.";
    setTimeout(() => {
      showNotification.value = false;
    }, 3000);
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      await importDataToIndexedDB(data);
      showNotification.value = true;
      notificationMessage.value = "Data imported successfully!";
      setTimeout(() => {
        showNotification.value = false;
      }, 3000);
    } catch (error) {
      console.error("Import failed:", error);
      showNotification.value = true;
      notificationMessage.value = "Import failed. Please try again.";
      setTimeout(() => {
        showNotification.value = false;
      }, 3000);
    }
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

async function updateLocalDbSize() {
  const data = await exportIndexedDBData();
  localDbSize.value = new Blob([JSON.stringify(data)]).size / 1024; // Convert to KB
}

updateLocalDbSize();
</script>

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
