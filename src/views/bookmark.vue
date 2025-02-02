<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { decryptContent, encryptContent, db } from "@/db.js";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-vue-next";
import { sha256 } from "js-sha256";

const getRandomPastelColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 90%, 98%)`;
};

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
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold mb-4">Add New Bookmark</h2>
      <input v-model="newBookmark.title" placeholder="Title" class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <input v-model="newBookmark.url" placeholder="URL" class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <textarea v-model="newBookmark.note" placeholder="Note" class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="3"></textarea>
      <button @click="addBookmark" class="bg-blue-500 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-600 transition-colors flex items-center justify-center">
        <PlusIcon class="mr-2" size="20" />
        Add Bookmark
      </button>
    </div>

    <div class="mb-6 relative">
      <input v-model="searchQuery" placeholder="Search bookmarks..." class="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <SearchIcon class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size="24" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div v-for="bookmark in paginatedBookmarks" :key="bookmark.id" class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300" :style="{ backgroundColor: getRandomPastelColor() }">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <a :href="bookmark.url" target="_blank" class="text-xl font-semibold text-blue-600 hover:underline break-words">
              {{ bookmark.title || bookmark.url }}
            </a>
            <button @click="removeBookmark(bookmark.id)" class="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-red-100 transition-colors">
              <XIcon size="20" />
            </button>
          </div>
          <p class="text-sm text-gray-600 mb-2 break-words">{{ bookmark.url }}</p>
          <p class="text-sm text-gray-700 break-words">{{ bookmark.note }}</p>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2">
      <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors">
        <ChevronLeftIcon size="24" />
      </button>
      <span v-for="page in totalPages" :key="page" @click="goToPage(page)" class="cursor-pointer px-4 py-2 rounded-full text-lg font-medium transition-colors" :class="page === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'">
        {{ page }}
      </span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors">
        <ChevronRightIcon size="24" />
      </button>
    </div>

    <p v-if="filteredBookmarks.length === 0" class="text-center text-gray-500 mt-8 text-lg">No bookmarks found matching your search.</p>
  </div>
</template>