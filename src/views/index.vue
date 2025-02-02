<script setup>
import { ref, onMounted } from "vue";
import { db } from "@/db";

const savedPasswords = ref(0);
const savedBookmarks = ref(0);
const savedNotes = ref(0);

const loadData = async () => {
  savedPasswords.value = await db.passwords.count();
  savedBookmarks.value = await db.bookmarks.count();
  savedNotes.value = await db.notes.count();
};

onMounted(loadData);
</script>

<template>
  <main>
    <section class="py-24">
      <div class="container mx-auto px-4">
        <div class="flex flex-wrap -mx-4">
          <div class="w-full lg:w-1/3 p-4">
            <div class="bg-blue-500 h-1 mb-10"></div>
            <h2 class="text-4xl font-bold font-heading mb-3">{{ savedPasswords }}</h2>
            <p class="text-gray-500">Saved Passwords</p>
          </div>

          <div class="w-full lg:w-1/3 p-4">
            <div class="bg-green-500 h-1 mb-10"></div>
            <h2 class="text-4xl font-bold font-heading mb-3">{{ savedBookmarks }}</h2>
            <p class="text-gray-500">Saved Bookmarks</p>
          </div>

          <div class="w-full lg:w-1/3 p-4">
            <div class="bg-orange-500 h-1 mb-10"></div>
            <h2 class="text-4xl font-bold font-heading mb-3">{{ savedNotes }}</h2>
            <p class="text-gray-500">Saved Notes</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
