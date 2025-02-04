<script setup>

import { ref, computed } from "vue";
import { encryptContent, db } from "@/db.js";
import { sha256 } from "js-sha256";
import Papa from 'papaparse';

const file = ref(null);
const importStatus = ref('');
const importProgress = ref(0);
const csvHeaders = ref([]);
const csvData = ref([]);
const columnMapping = ref({
  title: '',
  url: '',
  note: ''
});

const handleFileUpload = (event) => {
  file.value = event.target.files[0];
  parseCSV();
};

const parseCSV = () => {
  Papa.parse(file.value, {
    complete: (results) => {
      csvHeaders.value = results.data[0];
      csvData.value = results.data.slice(1);
      importStatus.value = 'CSV parsed. Please map the columns and start import.';
    },
    error: (error) => {
      importStatus.value = `Error parsing CSV: ${error.message}`;
    },
    header: false
  });
};

const pushToBookmarks = async (title, url, note) => {
  await db.bookmarks.add({
    id: sha256(url + title + note),
    title: encryptContent(title),
    url: encryptContent(url),
    note: encryptContent(note),
    updated_at: new Date().getTime(),
  });
};

const importBookmarks = async () => {
  if (!file.value) {
    importStatus.value = 'Please select a CSV file to import.';
    return;
  }

  if (!columnMapping.value.url) {
    importStatus.value = 'Please map the URL column before importing.';
    return;
  }

  importStatus.value = 'Importing...';
  importProgress.value = 0;

  const totalRows = csvData.value.length;
  let importedCount = 0;

  for (let i = 0; i < totalRows; i++) {
    const row = csvData.value[i];
    const title = columnMapping.value.title ? row[csvHeaders.value.indexOf(columnMapping.value.title)] : '';
    const url = row[csvHeaders.value.indexOf(columnMapping.value.url)];
    const note = columnMapping.value.note ? row[csvHeaders.value.indexOf(columnMapping.value.note)] : '';

    if (url) {
      await pushToBookmarks(title, url, note);
      importedCount++;
    }
    importProgress.value = Math.round((i + 1) / totalRows * 100);
  }

  importStatus.value = `Import complete. ${importedCount} bookmarks imported.`;
};

const isReadyToImport = computed(() => {
  return file.value && columnMapping.value.url;
});
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Import Bookmarks</h1>
    <div class="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <input type="file" accept=".csv" @change="handleFileUpload" class="mb-4" />
      
      <div v-if="csvHeaders.length > 0" class="mb-4">
        <h2 class="text-xl font-semibold mb-2">Map CSV Columns</h2>
        <div v-for="field in ['title', 'url', 'note']" :key="field" class="mb-2">
          <label :for="field" class="block text-sm font-medium text-gray-700">{{ field.charAt(0).toUpperCase() + field.slice(1) }}</label>
          <select :id="field" v-model="columnMapping[field]" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="">Select column</option>
            <option v-for="header in csvHeaders" :key="header" :value="header">{{ header }}</option>
          </select>
        </div>
      </div>

      <button @click="importBookmarks" :disabled="!isReadyToImport" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        Import Bookmarks
      </button>

      <div v-if="importStatus" class="mt-4 text-lg">
        {{ importStatus }}
      </div>

      <div v-if="importProgress > 0" class="mt-4">
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${importProgress}%` }"></div>
        </div>
        <p class="text-sm text-gray-600 mt-2">{{ importProgress }}% complete</p>
      </div>
    </div>
  </div>
</template>