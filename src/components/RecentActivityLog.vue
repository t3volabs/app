<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Activity Dashboard</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="p-3 rounded-md">
        <Pie :data="activityTypeData" :options="pieChartOptions" />
      </div>
      <div class="p-3 rounded-md">
        <Line :data="activityTimelineData" :options="lineChartOptions" />
      </div>
    </div>

    <h3 class="text-lg font-semibold text-gray-700 mb-2">Recent Activities</h3>
    <ul class="space-y-2">
      <li v-for="activity in recentActivities.slice(0, 5)" :key="activity.id" class="flex items-center text-sm">
        <component :is="getIcon(activity.type)" class="w-4 h-4 mr-2" :class="getIconColor(activity.type)" />
        <span class="flex-grow">{{ activity.message }}</span>

        <span class="text-gray-400">{{ format(activity.updated_at) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { KeyIcon, BookmarkIcon, FileTextIcon } from "lucide-vue-next";
import { db, decryptContent } from "@/db";
import { Chart as ChartJS, ArcElement, Tooltip, CategoryScale, LinearScale, PointElement, LineElement, Title } from "chart.js";
import { Pie, Line } from "vue-chartjs";
import { format, render, cancel, register } from "timeago.js";

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, PointElement, LineElement, Title);

const recentActivities = ref([]);

const getIcon = (type) => {
  const icons = { password: KeyIcon, bookmark: BookmarkIcon, note: FileTextIcon };
  return icons[type] || FileTextIcon;
};

const getIconColor = (type) => {
  const colors = { password: "text-blue-500", bookmark: "text-green-500", note: "text-orange-500" };
  return colors[type] || "text-gray-500";
};

const fetchRecentActivities = async () => {
  const limit = 10;
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

onMounted(fetchRecentActivities);
</script>
