<script setup>
import { ref, onMounted, computed } from "vue";
import { Cloud, Database, Check, X, RefreshCw, Key, Lock, AlertTriangle, Copy, Upload, Download } from "lucide-vue-next";
import { dbname as DataBaseName, db } from "@/db";
import CryptoJS from "crypto-js";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const showNotification = ref(false);
const notificationMessage = ref("");
const notificationType = ref("success");
const isSyncing = ref(false);
const lastSyncTime = ref(null);
const syncProgress = ref(0);
const isConfigured = ref(false);

const s3Config = ref({
  accessKeyId: "",
  secretAccessKey: "",
  bucket: "",
  endpoint: "",
  region: "",
});

const cryptoSeed = ref("");

let s3Client;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const masterSyncId = computed(() => {
  const configObject = {
    s3Config: s3Config.value,
    cryptoSeed: cryptoSeed.value
  };
  return stringToHex(JSON.stringify(configObject));
});

function stringToHex(str) {
  return Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

function hexToString(hex) {
  return hex.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
}

function exportMasterSyncId() {
  navigator.clipboard.writeText(masterSyncId.value)
    .then(() => displayNotification("Master Sync ID copied to clipboard!", "success"))
    .catch(() => displayNotification("Failed to copy Master Sync ID", "error"));
}

function importMasterSyncId() {
  const importedId = prompt("Please enter your Master Sync ID:");
  if (importedId) {
    try {
      const configObject = JSON.parse(hexToString(importedId));
      s3Config.value = configObject.s3Config;
      cryptoSeed.value = configObject.cryptoSeed;
      initializeS3();
      displayNotification("Master Sync ID imported successfully!", "success");
    } catch (error) {
      displayNotification("Invalid Master Sync ID", "error");
    }
  }
}

async function initializeS3() {
  if (!cryptoSeed.value || cryptoSeed.value.length < 10) {
    cryptoSeed.value = Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
  }

  if (s3Config.value.accessKeyId && s3Config.value.secretAccessKey && s3Config.value.bucket && s3Config.value.endpoint && s3Config.value.region && cryptoSeed.value) {
    s3Client = new S3Client({
      credentials: {
        accessKeyId: s3Config.value.accessKeyId,
        secretAccessKey: s3Config.value.secretAccessKey,
      },
      endpoint: s3Config.value.endpoint,
      region: s3Config.value.region,
      forcePathStyle: true,
    });

    isConfigured.value = true;
    localStorage.setItem("masterSyncId", masterSyncId.value);
    displayNotification("S3 configuration saved successfully!");
  } else {
    isConfigured.value = false;
    displayNotification("Please fill in all S3 configuration fields and the crypto seed.", "error");
  }
}

function encryptData(data) {
  try {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, cryptoSeed.value).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

function decryptData(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, cryptoSeed.value);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

async function syncWithCloud() {
  if (!isConfigured.value) {
    displayNotification("Please configure S3 and crypto seed first.", "error");
    return;
  }

  isSyncing.value = true;
  syncProgress.value = 0;
  try {
    const localData = await retryOperation(exportIndexedDBData);
    syncProgress.value = 20;

    const encryptedLocalData = encryptData(localData);
    syncProgress.value = 40;

    const encryptedCloudData = await retryOperation(fetchCloudData);
    syncProgress.value = 60;

    const cloudData = encryptedCloudData ? decryptData(encryptedCloudData) : {};
    syncProgress.value = 70;

    const syncedData = mergeData(localData, cloudData);
    syncProgress.value = 80;

    const encryptedSyncedData = encryptData(syncedData);
    await retryOperation(() => updateCloudData(encryptedSyncedData));
    syncProgress.value = 90;

    await retryOperation(() => importDataToIndexedDB(syncedData));

    lastSyncTime.value = new Date().toLocaleString();
    syncProgress.value = 100;
    displayNotification("Sync completed successfully!");
  } catch (error) {
    console.error("Sync failed:", error);
    displayNotification("Sync failed. Please try again.", "error");
  } finally {
    isSyncing.value = false;
  }
}

async function retryOperation(operation, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function exportIndexedDBData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DataBaseName);
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
  const request = indexedDB.open(DataBaseName);
  return new Promise((resolve, reject) => {
    request.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(db.objectStoreNames, "readwrite");
      transaction.oncomplete = () => {
        console.log("Data imported successfully");
        resolve();
      };
      transaction.onerror = () => {
        console.log("Failed to import data");
        reject("Failed to import data");
      };

      for (const storeName of Object.keys(data)) {
        if (db.objectStoreNames.contains(storeName)) {
          const store = transaction.objectStore(storeName);
          for (const item of data[storeName]) {
            store.put(item);
          }
        }
      }
    };
    request.onerror = () => reject("Failed to open IndexedDB");
  });
}

async function fetchCloudData() {
  try {
    const command = new GetObjectCommand({
      Bucket: s3Config.value.bucket,
      Key: "t3vo.json",
    });
    const response = await s3Client.send(command);
    return await response.Body.transformToString();
  } catch (err) {
    if (err.name === "NoSuchKey") {
      return null; // Return null if the file doesn't exist yet
    }
    throw err;
  }
}

async function updateCloudData(data) {
  const command = new PutObjectCommand({
    Bucket: s3Config.value.bucket,
    Key: "t3vo.json",
    Body: data,
    ContentType: "application/json",
  });
  return s3Client.send(command);
}

function mergeData(localData, cloudData) {
  const mergedData = { ...cloudData };

  for (const storeName in localData) {
    if (!mergedData[storeName]) mergedData[storeName] = [];

    localData[storeName].forEach((localItem) => {
      const cloudItem = mergedData[storeName].find((item) => item.id === localItem.id);
      if (!cloudItem || localItem.updated_at > cloudItem.updated_at) {
        const index = mergedData[storeName].findIndex((item) => item.id === localItem.id);
        if (index !== -1) {
          mergedData[storeName][index] = localItem;
        } else {
          mergedData[storeName].push(localItem);
        }
      }
    });
  }

  return mergedData;
}

function displayNotification(message, type = "success") {
  notificationMessage.value = message;
  notificationType.value = type;
  showNotification.value = true;
  setTimeout(() => {
    showNotification.value = false;
  }, 5000);
}

onMounted(async () => {
  // Check if master sync ID is stored in localStorage
  const storedMasterSyncId = localStorage.getItem("masterSyncId");
  if (storedMasterSyncId) {
    try {
      const configObject = JSON.parse(hexToString(storedMasterSyncId));
      s3Config.value = configObject.s3Config;
      cryptoSeed.value = configObject.cryptoSeed;
      await initializeS3();
    } catch (error) {
      console.error("Failed to load stored configuration:", error);
    }
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8 text-gray-800 flex items-center justify-center">
        <Database class="mr-4" size="36" />
        Cloud Sync Manager - Experimental
      </h1>

      <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div class="p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">S3 Configuration</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="accessKeyId" class="block text-sm font-medium text-gray-700 mb-1">Access Key ID</label>
              <input id="accessKeyId" v-model="s3Config.accessKeyId" type="text" placeholder="Access Key ID" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label for="secretAccessKey" class="block text-sm font-medium text-gray-700 mb-1">Secret Access Key</label>
              <input id="secretAccessKey" v-model="s3Config.secretAccessKey" type="password" placeholder="Secret Access Key" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label for="bucket" class="block text-sm font-medium text-gray-700 mb-1">Bucket Name</label>
              <input id="bucket" v-model="s3Config.bucket" type="text" placeholder="Bucket Name" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label for="endpoint" class="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
              <input id="endpoint" v-model="s3Config.endpoint" type="text" placeholder="S3 Endpoint" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label for="region" class="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input id="region" v-model="s3Config.region" type="text" placeholder="S3 Region" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div class="mt-4">
            <label for="cryptoSeed" class="block text-sm font-medium text-gray-700 mb-1">Crypto Seed</label>
            <input id="cryptoSeed" v-model="cryptoSeed" type="text" placeholder="Enter your 12-word crypto seed" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button @click="initializeS3" class="mt-4 w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center">
            <Key class="mr-2" size="20" />
            Save Configuration
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div class="p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Master Sync ID</h2>
          <div class="flex items-center justify-between mb-4">
            <input :value="masterSyncId" readonly class="w-full p-2 border border-gray-300 rounded-md mr-2" />
            <button @click="exportMasterSyncId" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center">
              <Copy class="mr-2" size="20" />
              Copy
            </button>
          </div>
          <button @click="importMasterSyncId" class="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center">
            <Upload class="mr-2" size="20" />
            Import Master Sync ID
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Cloud Sync</h2>
          <button @click="syncWithCloud" :disabled="isSyncing || !isConfigured" class="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center" :class="{ 'opacity-50 cursor-not-allowed': isSyncing || !isConfigured }">
            <Cloud class="mr-2" size="20" />
            {{ isSyncing ? "Syncing..." : "Sync with Cloud" }}
          </button>
          <p v-if="lastSyncTime" class="mt-2 text-sm text-gray-600 text-center">Last synced: {{ lastSyncTime }}</p>
        </div>
      </div>

      <div v-if="isSyncing" class="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Sync Progress</h3>
          <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" :style="{ width: `${syncProgress}%` }"></div>
          </div>
          <p class="text-sm text-gray-600 text-center">{{ syncProgress }}% Complete</p>
        </div>
      </div>

      <div v-if="!isSyncing" class="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Sync Status</h3>
          <div class="flex items-center justify-center">
            <RefreshCw class="text-green-500 mr-2" size="24" />
            <p class="text-green-600">{{ isConfigured ? "Ready to sync" : "S3 not configured" }}</p>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showNotification"
        class="fixed bottom-4 right-4 p-4 rounded-md shadow-lg"
        :class="{
          'bg-green-100 text-green-700': notificationType === 'success',
          'bg-yellow-100 text-yellow-700': notificationType === 'warning',
          'bg-red-100 text-red-700': notificationType === 'error',
        }"
      >
        <div class="flex items-center">
          <Check v-if="notificationType === 'success'" class="mr-2" size="20" />
          <AlertTriangle v-else-if="notificationType === 'warning'" class="mr-2" size="20" />
          <X v-else class="mr-2" size="20" />
          <p>{{ notificationMessage }}</p>
        </div>
      </div>
    </transition>
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

