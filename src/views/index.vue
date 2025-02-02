<template>
  <div class="p-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard title="Passwords" :count="savedPasswords" icon="KeyIcon" color="blue" />
      <StatCard title="Bookmarks" :count="savedBookmarks" icon="BookmarkIcon" color="green" />
      <StatCard title="Notes" :count="savedNotes" icon="FileTextIcon" color="orange" />
    </div>
    <PasswordSuggester />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { db } from "@/db";
import { KeyIcon, BookmarkIcon, FileTextIcon } from "lucide-vue-next";
import StatCard from "@/components/StatCard.vue";
import PasswordSuggester from "@/components/PasswordSuggester.vue";

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
