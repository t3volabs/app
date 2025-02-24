<template>
  <div class="min-h-screen bg-gray-50 p-6 md:p-12">
    <div class="container mx-auto">
      <!-- Main Content -->
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <!-- Password Suggester -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Password Suggester</h2>
          <div class="flex items-center justify-between bg-gray-100 p-3 rounded-lg mb-4">
            <p class="text-lg font-mono text-gray-800">{{ suggestedPassword }}</p>
            <button @click="copyToClipboard" class="text-blue-500 hover:text-blue-600 focus:outline-none">
              <ClipboardCopyIcon class="w-5 h-5" />
            </button>
          </div>
          <div class="flex items-center justify-between">
            <button @click="generatePassword" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Generate New</button>
            <div class="flex items-center text-sm text-gray-600">
              <RefreshCwIcon class="w-4 h-4 mr-2" />
              <span>Refreshes in {{ countdown }}s</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Statistics</h2>
          <div class="grid grid-cols-2 gap-4">
            <div v-for="(stat, index) in stats" :key="index" class="text-center">
              <p class="text-2xl font-bold text-gray-800">{{ stat.count }}</p>
              <p class="text-sm text-gray-600">{{ stat.title }}</p>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <ul class="space-y-2 max-h-[300px] overflow-y-auto">
            <li v-for="activity in recentActivities.slice(0, 5)" :key="activity.id" class="flex items-center text-sm">
              <component :is="getIcon(activity.type)" class="w-4 h-4 mr-2" :class="getIconColor(activity.type)" />
              <span class="flex-grow truncate">{{ activity.message }}</span>
              <span class="text-gray-400 text-xs ml-2">{{ format(activity.updated_at) }}</span>
            </li>
          </ul>
        </div>

        <!-- Activity Chart -->
        <div class="bg-white rounded-lg shadow-sm p-6 md:col-span-3">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Activity Overview</h2>
          <div class="h-80">
            <Line :data="activityTimelineData" :options="lineChartOptions" />
          </div>
        </div>
      </div>

      <!-- About Section -->
      <div class="mt-12 bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Open Source for Everyone</h2>
        <p class="text-gray-700 mb-6">We believe in the power of community-driven development. That's why T3VO is open source and available for anyone to contribute to or use.</p>
        <div class="flex flex-wrap gap-4">
          <a href="https://github.com/t3volabs/app" target="_blank" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <GithubIcon class="h-5 w-5 mr-2" />
            View on GitHub
          </a>
          <a href="https://github.com/t3volabs/app/issues" target="_blank" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <AlertCircleIcon class="h-5 w-5 mr-2" />
            Report an Issue
          </a>
          <a href="https://t.me/t3volabs" target="_blank" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <UsersRound class="h-5 w-5 mr-2" />
            Join Telegram
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { version } from "../../package.json";
import { db, decryptContent } from "@/db";
import { KeyIcon, BookmarkIcon, FileTextIcon, GithubIcon, AlertCircleIcon, UsersRound, ClipboardCopyIcon, RefreshCwIcon } from "lucide-vue-next";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { Line } from "vue-chartjs";
import { format } from "timeago.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Stats
const savedPasswords = ref(0);
const savedBookmarks = ref(0);
const savedNotes = ref(0);

const stats = computed(() => [
  { title: "Version", count: version },
  { title: "Passwords", count: savedPasswords.value },
  { title: "Bookmarks", count: savedBookmarks.value },
  { title: "Notes", count: savedNotes.value },
]);

// Recent Activities
const recentActivities = ref([]);

const getIcon = (type) => {
  const icons = { password: KeyIcon, bookmark: BookmarkIcon, note: FileTextIcon };
  return icons[type] || FileTextIcon;
};

const getIconColor = (type) => {
  const colors = { password: "text-blue-500", bookmark: "text-green-500", note: "text-orange-500" };
  return colors[type] || "text-gray-500";
};

// Chart
const activityTimelineData = computed(() => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const activityCounts = last7Days.reduce(
    (acc, date) => ({
      ...acc,
      [date]: { password: 0, bookmark: 0, note: 0 },
    }),
    {}
  );

  recentActivities.value.forEach((activity) => {
    const date = new Date(activity.updated_at).toISOString().split("T")[0];
    if (activityCounts[date]) {
      activityCounts[date][activity.type]++;
    }
  });

  return {
    labels: last7Days.map((date) => new Date(date).toLocaleDateString("en-US", { weekday: "short" })),
    datasets: [
      {
        label: "Passwords",
        data: Object.values(activityCounts).map((counts) => counts.password),
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
      },
      {
        label: "Bookmarks",
        data: Object.values(activityCounts).map((counts) => counts.bookmark),
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.5)",
      },
      {
        label: "Notes",
        data: Object.values(activityCounts).map((counts) => counts.note),
        borderColor: "#F97316",
        backgroundColor: "rgba(249, 115, 22, 0.5)",
      },
    ],
  };
});

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
    title: { display: true, text: "Activity Over Last 7 Days" },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
    },
  },
};

// Password Suggester
const suggestedPassword = ref("");
const countdown = ref(60);

const generatePassword = () => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]|:;<>,.?~";
  const length = Math.floor(Math.random() * (18 - 12 + 1)) + 12;
  suggestedPassword.value = Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => charset[x % charset.length])
    .join("");
  countdown.value = 60;
};

const copyToClipboard = () => {
  navigator.clipboard
    .writeText(suggestedPassword.value)
    .then(() => {
      console.log("Password copied to clipboard!");
      // You could add a temporary success message here
    })
    .catch((err) => {
      console.error("Failed to copy password: ", err);
      // You could add a temporary error message here
    });
};

// Data fetching
const loadData = async () => {
  savedPasswords.value = await db.passwords.count();
  savedBookmarks.value = await db.bookmarks.count();
  savedNotes.value = await db.notes.count();
};

const fetchRecentActivities = async () => {
  const limit = 20;
  const tables = ["notes", "bookmarks", "passwords"];
  const allActivities = [];

  for (const table of tables) {
    const items = await db[table].orderBy("updated_at").reverse().limit(limit).toArray();
    allActivities.push(
      ...items.map((item) => ({
        ...item,
        type: table.slice(0, -1),
        message: `Updated ${table.slice(0, -1)}: ${decryptContent(item.title)}`,
      }))
    );
  }

  recentActivities.value = allActivities.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, limit);
};

// Lifecycle hooks
let intervalId;

onMounted(() => {
  loadData();
  fetchRecentActivities();
  generatePassword();
  intervalId = setInterval(() => {
    if (countdown.value > 1) {
      countdown.value--;
    } else {
      generatePassword();
    }
  }, 1000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>
