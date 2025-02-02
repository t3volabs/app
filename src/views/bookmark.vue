<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { decryptContent, encryptContent, db } from "@/db.js";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-vue-next";
import { sha256 } from "js-sha256";

async function pushToBookmarks(title, url, note) {
  await db.bookmarks.add({
    id: sha256(url + title + note),
    title: encryptContent(title),
    url: encryptContent(url),
    note: encryptContent(note),
    updated_at: new Date().getTime(),
  });
}

async function getBookmarks(page) {
  const bookmarks = await db.bookmarks
    .orderBy("updated_at")
    .reverse()
    .offset(page * 10)
    .limit(10)
    .toArray();

  return bookmarks.map((bookmark) => ({
    ...bookmark,
    title: decryptContent(bookmark.title),
    url: decryptContent(bookmark.url),
    note: decryptContent(bookmark.note),
  }));
}

const newBookmark = ref({ title: "", url: "", note: "" });
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;
const bookmarks = ref([]);

const loadBookmarks = async () => {
  bookmarks.value = await getBookmarks(0);
};

const addBookmark = async () => {
  if (newBookmark.value.url) {
    await pushToBookmarks(newBookmark.value.title, newBookmark.value.url, newBookmark.value.note);
    await loadBookmarks();
    newBookmark.value = { title: "", url: "", note: "" };
  }
};

const removeBookmark = async (id) => {
  await db.bookmarks.delete(id);
  bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.id !== id);
};

const filteredBookmarks = computed(() => {
  if (!searchQuery.value) return bookmarks.value;
  const query = searchQuery.value.toLowerCase();
  return bookmarks.value.filter((bookmark) => (bookmark.title && bookmark.title.toLowerCase().includes(query)) || bookmark.url.toLowerCase().includes(query));
});

const paginatedBookmarks = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return filteredBookmarks.value.slice(startIndex, startIndex + itemsPerPage);
});

const totalPages = computed(() => Math.ceil(filteredBookmarks.value.length / itemsPerPage));

const goToPage = (page) => (currentPage.value = page);
const nextPage = () => currentPage.value < totalPages.value && currentPage.value++;
const prevPage = () => currentPage.value > 1 && currentPage.value--;

const extractDomain = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname.replace("www.", "");
  } catch (e) {
    return "";
  }
};

watch(
  () => newBookmark.value.url,
  (newVal) => {
    if (newVal) {
      newBookmark.value.title = extractDomain(newVal);
    }
  }
);

onMounted(loadBookmarks);
</script>

<template>
  <div class="max-w-2xl mx-auto p-4">
    <div class="mb-6 p-4 border rounded-lg bg-gray-50 shadow">
      <input v-model="newBookmark.title" placeholder="Title" class="w-full p-2 mb-2 border rounded" />
      <input v-model="newBookmark.url" placeholder="URL" class="w-full p-2 mb-2 border rounded" />
      <textarea v-model="newBookmark.note" placeholder="note" class="w-full p-2 mb-2 border rounded" rows="3"></textarea>
      <button @click="addBookmark" class="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 transition-colors">Add Bookmark</button>
    </div>

    <div class="mb-4 relative">
      <input v-model="searchQuery" placeholder="Search bookmarks..." class="w-full p-2 pl-10 border rounded-lg" />
      <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
    </div>

    <ul class="space-y-4 mb-4">
      <li v-for="bookmark in paginatedBookmarks" :key="bookmark.id" class="p-4 border rounded-lg bg-white shadow hover:shadow-md transition-shadow">
        <div class="flex justify-between items-center">
          <div class="flex-grow">
            <a :href="bookmark.url" target="_blank" class="text-blue-600 hover:underline">
              {{ bookmark.title || bookmark.url }}
            </a>
            <p class="text-sm text-gray-500 truncate">{{ bookmark.url }}</p>
            <p class="text-sm text-gray-500">{{ bookmark.note }}</p>
          </div>
          <button @click="removeBookmark(bookmark.id)" class="text-red-500 hover:text-red-700 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2">
      <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-gray-200 disabled:opacity-50">
        <ChevronLeftIcon size="20" />
      </button>
      <span v-for="page in totalPages" :key="page" @click="goToPage(page)" class="cursor-pointer px-3 py-1 rounded-full" :class="page === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200'">
        {{ page }}
      </span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-gray-200 disabled:opacity-50">
        <ChevronRightIcon size="20" />
      </button>
    </div>

    <p v-if="filteredBookmarks.length === 0" class="text-center text-gray-500 mt-4">No bookmarks found matching your search.</p>
  </div>
</template>
