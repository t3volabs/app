<template>
  <div class="max-w-6xl mx-auto p-6">
    <!-- Add Note Form -->
    <div class="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold mb-4">Add New Note</h2>
      <input v-model="newNote.title" placeholder="Note Title" class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
      <textarea v-model="newNote.content" placeholder="Write your note here..." class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent h-32 resize-y"></textarea>
      <button @click="addNote" class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg w-full transition duration-300 flex items-center justify-center">
        <PlusIcon class="mr-2" size="20" />
        Save Note
      </button>
    </div>

    <!-- Search Input -->
    <div class="mb-6 relative">
      <input v-model="searchQuery" placeholder="Search notes..." class="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
      <SearchIcon class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size="24" />
    </div>

    <!-- Notes Grid -->
    <div class="grid grid-cols-1 gap-6 mb-8">
      <div v-for="note in paginatedNotes" :key="note.id" class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-semibold text-gray-800">{{ note.title || "Untitled Note" }}</h3>
            <button @click="removeNote(note.id)" class="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-red-100 transition-colors">
              <TrashIcon size="20" />
            </button>
          </div>
          <p class="text-gray-600 break-words">{{ note.expanded ? note.content : truncateContent(note.content) }}</p>
          <button v-if="note.content.length > 100" @click="toggleExpandNote(note)" class="mt-2 text-green-500 hover:text-green-600 transition-colors">
            {{ note.expanded ? 'Show less' : 'Show more' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2">
      <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors">
        <ChevronLeftIcon size="24" />
      </button>
      <span v-for="page in totalPages" :key="page" @click="goToPage(page)" class="cursor-pointer px-4 py-2 rounded-full text-lg font-medium transition-colors" :class="page === currentPage ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'">
        {{ page }}
      </span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors">
        <ChevronRightIcon size="24" />
      </button>
    </div>

    <!-- No Results Message -->
    <p v-if="filteredNotes.length === 0" class="text-center text-gray-500 mt-8 text-lg">No notes found matching your search.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { encryptContent, db, decryptContent } from "@/db";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, PlusIcon } from "lucide-vue-next";
import { sha256 } from "js-sha256";

async function pushToNotes(title, content, tags) {
  await db.notes.add({
    id: sha256(title + content),
    title: encryptContent(title),
    content: encryptContent(content),
    tags,
    updated_at: new Date().getTime(),
  });
}

async function getNotes(page) {
  const notes = await db.notes
    .orderBy("updated_at")
    .reverse()
    .offset(page * 10)
    .limit(10)
    .toArray();

  return notes.map((note) => ({
    ...note,
    title: decryptContent(note.title),
    content: decryptContent(note.content),
    expanded: false,
  }));
}

const newNote = ref({ title: "", content: "" });
const notes = ref([]); // Stores all notes
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;

// Load all notes from IndexedDB
const loadNotes = async () => {
  const rawNotes = await db.notes.orderBy("updated_at").reverse().toArray();

  notes.value = rawNotes.map((note) => ({
    ...note,
    title: decryptContent(note.title),
    content: decryptContent(note.content),
    expanded: false,
  }));
};

// Add a new note
const addNote = async () => {
  if (newNote.value.content) {
    await pushToNotes(newNote.value.title, newNote.value.content, []);
    await loadNotes();
    newNote.value = { title: "", content: "" };
  }
};

// Remove a note
const removeNote = async (id) => {
  await db.notes.delete(id);
  await loadNotes();
};

// Apply search filtering
const filteredNotes = computed(() => {
  if (!searchQuery.value) return notes.value;

  const query = searchQuery.value.toLowerCase();
  return notes.value.filter((note) => note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query));
});

// Apply pagination after filtering
const paginatedNotes = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return filteredNotes.value.slice(startIndex, startIndex + itemsPerPage);
});

// Calculate total pages based on filtered results
const totalPages = computed(() => Math.ceil(filteredNotes.value.length / itemsPerPage));

// Pagination controls
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// Truncate content
const truncateContent = (content, length = 100) => {
  if (content.length <= length) return content;
  return content.slice(0, length) + '...';
};

// Toggle note expansion
const toggleExpandNote = (note) => {
  note.expanded = !note.expanded;
};

// Load notes on mount
onMounted(loadNotes);
</script>

<style scoped>
/* Add any additional styles here if needed */
</style>

