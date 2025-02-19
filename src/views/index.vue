<template>
  <div class="p-12">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
      <StatCard title="Version" :count="version" />
      <StatCard title="Passwords" :count="savedPasswords" />
      <StatCard title="Bookmarks" :count="savedBookmarks" />
      <StatCard title="Notes" :count="savedNotes" />
    </div>

    <RecentActivityLog />

    <aboutCard />
  </div>
</template>

<script setup>
import { version } from "../../package.json";

import { ref, onMounted } from "vue";
import { db } from "@/db";

import StatCard from "@/components/StatCard.vue";
import RecentActivityLog from "@/components/RecentActivityLog.vue";
import aboutCard from "@/components/aboutCard.vue";

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
