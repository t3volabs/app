<template>
  <div class="p-12">
    <!-- Stat Cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
      <div v-for="(stat, index) in stats" :key="index" class="p-6 transition duration-300 ease-in-out transform hover:scale-105">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-700">{{ stat.title }}</h2>
        </div>
        <div class="h-1 w-16 bg-blue-500 mb-4"></div>
        <p class="text-3xl font-bold text-gray-800">{{ stat.count }}</p>
      </div>
    </div>

    <!-- Password Suggester -->
    <div class="mb-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Secure Password Suggester</h2>
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="mb-6">
          <div class="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <p class="text-lg font-mono text-gray-800">{{ suggestedPassword }}</p>
            <button @click="copyToClipboard" class="text-blue-500 hover:text-blue-600 focus:outline-none transition duration-300 ease-in-out transform hover:scale-110">
              <ClipboardCopyIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <button @click="generatePassword" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
            Generate New Password
          </button>
          <div class="flex items-center">
            <RefreshCwIcon class="w-4 h-4 text-gray-500 mr-2" />
            <p class="text-sm text-gray-600">Refreshes in {{ countdown }}s</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Log -->
    <div class="p-4">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Activity Dashboard</h2>

      <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div class="space-y-4">
          <div class="p-3 rounded-md h-[300px]">
            <Pie :data="activityTypeData" :options="pieChartOptions" />
          </div>
          <div class="p-3 rounded-md h-[300px]">
            <Line :data="activityTimelineData" :options="lineChartOptions" />
          </div>
        </div>

        <div class="">
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Recent Activities</h3>
          <ul class="space-y-2 max-h-[600px] overflow-y-auto">
            <li v-for="activity in recentActivities" :key="activity.id" class="flex items-center text-sm">
              <component :is="getIcon(activity.type)" class="w-4 h-4 mr-2" :class="getIconColor(activity.type)" />
              <span class="flex-grow">{{ activity.message }}</span>
              <span class="text-gray-400 text-xs">{{ format(activity.updated_at) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- About Card -->
    <div class="flex flex-col md:flex-row mt-8">
      <div class="md:w-2/3 p-8 md:p-12 lg:p-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Open Source <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">for Everyone</span></h2>
        <p class="text-xl text-gray-700 mb-8 leading-relaxed">We believe in the power of community-driven development. That's why T3VO is open source and available for anyone to contribute to or use. Join us in shaping the future of password management!</p>
      </div>
      <div class="md:w-1/3 p-8 md:p-12 flex flex-col justify-center space-y-4">
        <a href="https://github.com/t3volabs/app" target="_blank" class="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <GithubIcon class="h-5 w-5 mr-2" />
          View on GitHub
        </a>
        <a href="https://github.com/t3volabs/app/issues" target="_blank" class="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          <AlertCircleIcon class="h-5 w-5 mr-2" />
          Report an Issue
        </a>
        <a href="https://t.me/t3volabs" target="_blank" class="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-medium text-gray-700 bg-blue border border-gray-300 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          <UsersRound class="h-5 w-5 mr-2" />
          Join Telegram
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { version } from "../../package.json";
import { db, decryptContent } from "@/db";
import { KeyIcon, BookmarkIcon, FileTextIcon, GithubIcon, AlertCircleIcon, UsersRound, ClipboardCopyIcon, RefreshCwIcon } from "lucide-vue-next";
import { Chart as ChartJS, ArcElement, Tooltip, CategoryScale, LinearScale, PointElement, LineElement, Title } from "chart.js";
import { Pie, Line } from "vue-chartjs";
import { format } from "timeago.js";

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, PointElement, LineElement, Title);

const savedPasswords = ref(0);
const savedBookmarks = ref(0);
const savedNotes = ref(0);
const recentActivities = ref([]);

const stats = computed(() => [
  { title: "Version", count: String(version) },
  { title: "Passwords", count: String(savedPasswords.value) },
  { title: "Bookmarks", count: String(savedBookmarks.value) },
  { title: "Notes", count: String(savedNotes.value) },
]);

const loadData = async () => {
  savedPasswords.value = await db.passwords.count();
  savedBookmarks.value = await db.bookmarks.count();
  savedNotes.value = await db.notes.count();
};

const getIcon = (type) => {
  const icons = { password: KeyIcon, bookmark: BookmarkIcon, note: FileTextIcon };
  return icons[type] || FileTextIcon;
};

const getIconColor = (type) => {
  const colors = { password: "text-blue-500", bookmark: "text-green-500", note: "text-orange-500" };
  return colors[type] || "text-gray-500";
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

const activityTypeData = computed(() => ({
  labels: ["Passwords", "Bookmarks", "Notes"],
  datasets: [
    {
      data: ["password", "bookmark", "note"].map((type) => recentActivities.value.filter((activity) => activity.type === type).length),
      backgroundColor: ["#3B82F6", "#10B981", "#F97316"],
    },
  ],
}));

const activityTimelineData = computed(() => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const activityCounts = last7Days.reduce((acc, date) => ({ ...acc, [date]: 0 }), {});

  recentActivities.value.forEach((activity) => {
    const date = new Date(activity.updated_at).toISOString().split("T")[0];
    if (activityCounts[date] !== undefined) {
      activityCounts[date]++;
    }
  });

  return {
    labels: last7Days.map((date) => new Date(date).toLocaleDateString("en-US", { weekday: "short" })),
    datasets: [
      {
        label: "Activities",
        data: Object.values(activityCounts),
        borderColor: "#6366F1",
        tension: 0.1,
        fill: true,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
      },
    ],
  };
});

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 6 } },
    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw}` } },
  },
};

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
    x: { grid: { display: false } },
  },
  elements: { point: { radius: 4, hoverRadius: 6 } },
};

// Password Suggester logic
const suggestedPassword = ref('');
const countdown = ref(60);

const generatePassword = () => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]|:;<>,.?~';
  const length = Math.floor(Math.random() * (18 - 12 + 1)) + 12;
  suggestedPassword.value = Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => charset[x % charset.length])
    .join('');
  countdown.value = 60;
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(suggestedPassword.value)
    .then(() => {
      console.log('Password copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy password: ', err);
    });
};

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