import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/leaderboard', name: 'leaderboard', component: () => import('@/views/LeaderboardView.vue') },
    { path: '/daily', name: 'daily', component: () => import('@/views/DailyView.vue') },
    { path: '/players/:id', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/friends', name: 'friends', component: () => import('@/views/FriendsView.vue') },
    { path: '/create', name: 'create', component: () => import('@/views/CreateView.vue') },
    { path: '/:code([A-Z0-9]{4})', name: 'room', component: () => import('@/views/RoomView.vue') },
    { path: '/:rest(.*)', redirect: '/' },
  ],
})
