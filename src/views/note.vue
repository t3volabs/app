<script setup>
import { ref, onMounted, computed } from "vue";
import { encryptContent, db, decryptContent } from "@/db";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from "lucide-vue-next";
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

// Load notes on mount
onMounted(loadNotes);
</script>

<template>
  <div class="max-w-2xl mx-auto p-4">
    <!-- Add Note Form -->
    <div class="mb-6 p-4 border rounded-lg bg-gray-50 shadow">
      <input v-model="newNote.title" placeholder="Note Title" class="w-full p-2 mb-2 border rounded" />
      <textarea v-model="newNote.content" placeholder="Write your note here..." class="w-full p-2 mb-2 border rounded h-32 resize-y"></textarea>
      <button @click="addNote" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full transition duration-300">Save Note</button>
    </div>

    <!-- Search Input -->
    <div class="mb-4 relative">
      <input v-model="searchQuery" placeholder="Search notes..." class="w-full p-2 pl-10 border rounded-lg" />
      <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
    </div>

    <!-- Notes List -->
    <ul class="space-y-4 mb-4">
      <li v-for="note in paginatedNotes" :key="note.id" class="p-4 border rounded-lg bg-white shadow hover:shadow-md transition duration-300">
        <div class="flex justify-between items-start">
          <div class="flex-grow">
            <h2 class="text-xl font-semibold mb-2">{{ note.title || "Untitled Note" }}</h2>
            <p class="text-gray-600">{{ note.content }}</p>
          </div>
          <button @click="removeNote(note.id)" class="text-red-500 hover:text-red-700 transition duration-300 p-1">
            <TrashIcon size="20" />
          </button>
        </div>
      </li>
    </ul>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2">
      <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-gray-200 disabled:opacity-50">
        <ChevronLeftIcon size="20" />
      </button>
      <span v-for="page in totalPages" :key="page" @click="goToPage(page)" class="cursor-pointer px-3 py-1 rounded-full" :class="page === currentPage ? 'bg-green-500 text-white' : 'bg-gray-200'">
        {{ page }}
      </span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-gray-200 disabled:opacity-50">
        <ChevronRightIcon size="20" />
      </button>
    </div>

    <!-- No Results Message -->
    <p v-if="filteredNotes.length === 0" class="text-center text-gray-500 mt-4">No notes found matching your search.</p>
  </div>
</template>
