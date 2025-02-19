<template>
  <div class="rounded-lg shadow-md p-6 mt-6">
    <h2 class="text-xl font-semibold text-gray-700 mb-4">Recent Activity</h2>
    <ul class="space-y-2">
      <li v-for="activity in recentActivities" :key="activity.id" class="flex items-center text-sm">
        <component :is="getIcon(activity.type)" class="w-4 h-4 mr-2" :class="getIconColor(activity.type)" />
        <span>{{ activity.message }}</span>
        <span class="ml-auto text-gray-400">{{ formatDate(activity.updated_at) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { KeyIcon, BookmarkIcon, FileTextIcon } from "lucide-vue-next";
import { db, decryptContent } from "@/db";

const recentActivities = ref([]);

const getIcon = (type) => {
  switch (type) {
    case "password":
      return KeyIcon;
    case "bookmark":
      return BookmarkIcon;
    case "note":
      return FileTextIcon;
    default:
      return FileTextIcon;
  }
};

const getIconColor = (type) => {
  switch (type) {
    case "password":
      return "text-blue-500";
    case "bookmark":
      return "text-green-500";
    case "note":
      return "text-orange-500";
    default:
      return "text-gray-500";
  }
};

const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const fetchRecentActivities = async () => {
  const limit = 8 + Math.floor(Math.random() * 18) ;

  const notes = await db.notes.orderBy("updated_at").reverse().limit(limit).toArray();
  const bookmarks = await db.bookmarks.orderBy("updated_at").reverse().limit(limit).toArray();
  const passwords = await db.passwords.orderBy("updated_at").reverse().limit(limit).toArray();

  const allActivities = [
    ...notes.map((note) => ({ ...note, type: "note", message: `Updated note: ${decryptContent(note.title)}` })),
    ...bookmarks.map((bookmark) => ({ ...bookmark, type: "bookmark", message: `Updated bookmark: ${decryptContent(bookmark.title)}` })),
    ...passwords.map((password) => ({ ...password, type: "password", message: `Updated password for: ${decryptContent(password.title)}` })),
  ];

  allActivities.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  recentActivities.value = allActivities.slice(0, limit);
};

onMounted(fetchRecentActivities);
</script>
