import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/index.vue";
import BookMark from "../views/bookmark.vue";
import PassWord from "../views/password.vue";
import Note from "../views/note.vue";
import Backup from "../views/backup.vue";
import About from "../views/about.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/bookmark",
      name: "bookmark",
      component: BookMark,
    },
    {
      path: "/password",
      name: "password",
      component: PassWord,
    },
    {
      path: "/note",
      name: "note",
      component: Note,
    },
    {
      path: "/backup",
      name: "backup",
      component: Backup,
    },
    {
      path: "/about",
      name: "about",
      component: About,
    },

  ],
});

export default router;
