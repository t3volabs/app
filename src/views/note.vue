<script setup>
import { ref, onMounted, computed } from "vue";
import { encryptContent, db, decryptContent } from "@/db";
import { Search, ChevronLeft, ChevronRight, Trash, Plus, FileText, Tag, Calendar } from "lucide-vue-next";
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
const notes = ref([]);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;
const showAddForm = ref(false);

const loadNotes = async () => {
  const rawNotes = await db.notes.orderBy("updated_at").reverse().toArray();

  notes.value = rawNotes.map((note) => ({
    ...note,
    title: decryptContent(note.title),
    content: decryptContent(note.content),
    expanded: false,
  }));
};

const addNote = async () => {
  if (newNote.value.content) {
    await pushToNotes(newNote.value.title, newNote.value.content, []);
    await loadNotes();
    newNote.value = { title: "", content: "" };
    showAddForm.value = false;
  }
};

const removeNote = async (id) => {
  if (confirm("Are you sure you want to delete this note?")) {
    await db.notes.delete(id);
    await loadNotes();
  }
};

const filteredNotes = computed(() => {
  if (!searchQuery.value) return notes.value;

  const query = searchQuery.value.toLowerCase();
  return notes.value.filter((note) => note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query));
});

const paginatedNotes = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return filteredNotes.value.slice(startIndex, startIndex + itemsPerPage);
});

const totalPages = computed(() => Math.ceil(filteredNotes.value.length / itemsPerPage));

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

const truncateContent = (content, length = 150) => {
  if (content.length <= length) return content;
  return content.slice(0, length) + '...';
};

const toggleExpandNote = (note) => {
  note.expanded = !note.expanded;
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

onMounted(loadNotes);
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="m-auto container">
      <h1 class="text-4xl font-bold mb-8 text-gray-800 flex items-center">
        <FileText class="mr-4" size="36" />
        Notes Manager
      </h1>

      <div class="mb-8 flex items-center justify-between">
        <div class="relative flex-grow mr-4">
          <input 
            v-model="searchQuery" 
            placeholder="Search notes..." 
            class="w-full pl-10 pr-4 py-2 rounded-full border-2 border-gray-300 focus:border-green-500 focus:outline-none transition-colors"
          />
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
        </div>
        <button 
          @click="showAddForm = !showAddForm" 
          class="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors flex items-center"
        >
          <Plus size="20" class="mr-2" />
          Add Note
        </button>
      </div>

      <div v-if="showAddForm" class="mb-8 p-6 bg-white rounded-xl shadow-lg transition-all duration-300 ease-in-out">
        <h2 class="text-2xl font-bold mb-4">Add New Note</h2>
        <input 
          v-model="newNote.title" 
          placeholder="Note Title" 
          class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <textarea 
          v-model="newNote.content" 
          placeholder="Write your note here..." 
          class="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent h-32 resize-y"
        ></textarea>
        <button 
          @click="addNote" 
          class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg w-full transition duration-300 flex items-center justify-center"
        >
          <Plus class="mr-2" size="20" />
          Save Note
        </button>
      </div>

      <div class="space-y-6 mb-8">
        <div 
          v-for="note in paginatedNotes" 
          :key="note.id" 
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-2xl font-semibold text-gray-800">{{ note.title || "Untitled Note" }}</h3>
              <button @click="removeNote(note.id)" class="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-red-100 transition-colors">
                <Trash size="20" />
              </button>
            </div>
            <p class="text-gray-600 break-words mb-4">
              {{ note.expanded ? note.content : truncateContent(note.content) }}
            </p>
            <div class="flex justify-between items-center">
              <button 
                v-if="note.content.length > 150" 
                @click="toggleExpandNote(note)" 
                class="text-green-500 hover:text-green-600 transition-colors"
              >
                {{ note.expanded ? 'Show less' : 'Show more' }}
              </button>
              <div class="flex items-center text-sm text-gray-500">
                <Calendar size="16" class="mr-1" />
                {{ formatDate(note.updated_at) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center items-center space-x-4">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1" 
          class="p-2 rounded-full bg-white shadow disabled:opacity-50 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size="24" />
        </button>
        <span class="text-lg font-medium">Page {{ currentPage }} of {{ totalPages }}</span>
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages" 
          class="p-2 rounded-full bg-white shadow disabled:opacity-50 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size="24" />
        </button>
      </div>

      <p 
        v-if="filteredNotes.length === 0" 
        class="text-center text-gray-500 mt-8 text-lg flex items-center justify-center"
      >
        <Search size="24" class="mr-2" />
        No notes found matching your search.
      </p>
    </div>
  </div>
</template>