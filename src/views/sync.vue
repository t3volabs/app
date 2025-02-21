<script setup>
import { ref, onMounted } from "vue";
import { Cloud, Database, Check, X, RefreshCw, Key, Lock } from "lucide-vue-next";
import { dbname as DataBaseName, db } from "@/db";
import CryptoJS from 'crypto-js';

// Create a shim for the global object
if (typeof global === 'undefined') {
  window.global = window;
}

// We'll load the AWS SDK dynamically
let AWS;
const loadAWS = async () => {
  if (!AWS) {
    await import('aws-sdk/dist/aws-sdk.min.js');
    AWS = window.AWS;
  }
};

const showNotification = ref(false);
const notificationMessage = ref("");
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

async function initializeS3() {
  if (
    s3Config.value.accessKeyId &&
    s3Config.value.secretAccessKey &&
    s3Config.value.bucket &&
    s3Config.value.endpoint &&
    s3Config.value.region &&
    cryptoSeed.value
  ) {
    await loadAWS();
    AWS.config.update({
      accessKeyId: s3Config.value.accessKeyId,
      secretAccessKey: s3Config.value.secretAccessKey,
      endpoint: s3Config.value.endpoint,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
      region: s3Config.value.region,
    });

    s3Client = new AWS.S3();
    isConfigured.value = true;
    localStorage.setItem('s3Config', JSON.stringify(s3Config.value));
    localStorage.setItem('cryptoSeed', cryptoSeed.value);
    displayNotification("S3 configuration saved successfully!");
  } else {
    isConfigured.value = false;
    displayNotification("Please fill in all S3 configuration fields and the crypto seed.", "error");
  }
}

function encryptData(data) {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, cryptoSeed.value).toString();
}

function decryptData(encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, cryptoSeed.value);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

async function syncWithCloud() {
  if (!isConfigured.value) {
    displayNotification("Please configure S3 and crypto seed first.", "error");
    return;
  }

  isSyncing.value = true;
  syncProgress.value = 0;
  try {
    const localData = await exportIndexedDBData();
    syncProgress.value = 20;

    const encryptedLocalData = encryptData(localData);
    syncProgress.value = 40;

    const encryptedCloudData = await fetchCloudData();
    syncProgress.value = 60;

    const cloudData = encryptedCloudData ? decryptData(encryptedCloudData) : {};
    syncProgress.value = 70;

    const syncedData = mergeData(localData, cloudData);
    syncProgress.value = 80;

    const encryptedSyncedData = encryptData(syncedData);
    await updateCloudData(encryptedSyncedData);
    syncProgress.value = 90;

    await importDataToIndexedDB(syncedData);

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
            } else {
              store.put(item);
            }
          };
        }
      }
    }
  };
}

async function fetchCloudData() {
  return new Promise((resolve, reject) => {
    s3Client.getObject({
      Bucket: s3Config.value.bucket,
      Key: "app-data.json"
    }, (err, data) => {
      if (err) {
        if (err.code === 'NoSuchKey') {
          resolve(null); // Return null if the file doesn't exist yet
        } else {
          reject(err);
        }
      } else {
        resolve(data.Body.toString());
      }
    });
  });
}

async function updateCloudData(data) {
  return new Promise((resolve, reject) => {
    s3Client.putObject({
      Bucket: s3Config.value.bucket,
      Key: "app-data.json",
      Body: data,
      ContentType: "application/json"
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function mergeData(localData, cloudData) {
  const mergedData = { ...cloudData };

  for (const storeName in localData) {
    if (!mergedData[storeName]) mergedData[storeName] = [];

    localData[storeName].forEach(localItem => {
      const cloudItem = mergedData[storeName].find(item => item.id === localItem.id);
      if (!cloudItem || localItem.updated_at > cloudItem.updated_at) {
        const index = mergedData[storeName].findIndex(item => item.id === localItem.id);
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
  showNotification.value = true;
  setTimeout(() => {
    showNotification.value = false;
  }, 3000);
}

onMounted(async () => {
  // Check if S3 config and crypto seed are stored in localStorage
  const storedConfig = localStorage.getItem('s3Config');
  const storedSeed = localStorage.getItem('cryptoSeed');
  if (storedConfig && storedSeed) {
    s3Config.value = JSON.parse(storedConfig);
    cryptoSeed.value = storedSeed;
    await initializeS3();
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8 text-gray-800 flex items-center justify-center">
        <Database class="mr-4" size="36" />
        Cloud Sync Manager
      </h1>

      <div class="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div class="p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">S3 Configuration</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="accessKeyId" class="block text-sm font-medium text-gray-700 mb-1">Access Key ID</label>
              <input
                id="accessKeyId"
                v-model="s3Config.accessKeyId"
                type="text"
                placeholder="Access Key ID"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="secretAccessKey" class="block text-sm font-medium text-gray-700 mb-1">Secret Access Key</label>
              <input
                id="secretAccessKey"
                v-model="s3Config.secretAccessKey"
                type="password"
                placeholder="Secret Access Key"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="bucket" class="block text-sm font-medium text-gray-700 mb-1">Bucket Name</label>
              <input
                id="bucket"
                v-model="s3Config.bucket"
                type="text"
                placeholder="Bucket Name"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="endpoint" class="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
              <input
                id="endpoint"
                v-model="s3Config.endpoint"
                type="text"
                placeholder="S3 Endpoint"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label for="region" class="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                id="region"
                v-model="s3Config.region"
                type="text"
                placeholder="S3 Region"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="mt-4">
            <label for="cryptoSeed" class="block text-sm font-medium text-gray-700 mb-1">12-Word Crypto Seed</label>
            <input
              id="cryptoSeed"
              v-model="cryptoSeed"
              type="password"
              placeholder="Enter your 12-word crypto seed"
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            @click="initializeS3"
            class="mt-4 w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center"
          >
            <Key class="mr-2" size="20" />
            Save Configuration
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="p-6">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Cloud Sync</h2>
          <button
            @click="syncWithCloud"
            :disabled="isSyncing || !isConfigured"
            class="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
            :class="{ 'opacity-50 cursor-not-allowed': isSyncing || !isConfigured }"
          >
            <Cloud class="mr-2" size="20" />
            {{ isSyncing ? 'Syncing...' : 'Sync with Cloud' }}
          </button>
          <p v-if="lastSyncTime" class="mt-2 text-sm text-gray-600 text-center">
            Last synced: {{ lastSyncTime }}
          </p>
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
            <p class="text-green-600">{{ isConfigured ? 'Ready to sync' : 'S3 not configured' }}</p>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showNotification" class="fixed bottom-4 right-4 p-4 rounded-md shadow-lg" :class="notificationMessage.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
        <div class="flex items-center">
          <Check v-if="!notificationMessage.includes('failed')" class="mr-2" size="20" />
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