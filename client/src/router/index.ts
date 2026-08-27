import { createRouter, createWebHistory } from 'vue-router';
import HomeLayout from '@/layouts/HomeLayout.vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import AppLayout from '@/layouts/AppLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 80,
      };
    }
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  },
  routes: [
    // 1. Home Layout (Marketing Landing)
    {
      path: '/',
      component: HomeLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/Home.vue'),
        },
      ],
    },

    // 2. Default Layout (Static Pages)
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: 'manual',
          name: 'manual',
          component: () => import('@/pages/Manual.vue'),
        },
        {
          path: 'terms',
          name: 'terms',
          component: () => import('@/pages/Terms.vue'),
        },
        {
          path: 'privacy',
          name: 'privacy',
          component: () => import('@/pages/Privacy.vue'),
        },
        {
          path: 'contact',
          name: 'contact',
          component: () => import('@/pages/Contact.vue'),
        },
      ],
    },

    // 3. Auth Layout (Authentication Pages)
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/auth/Login.vue'),
        },
        {
          path: 'signup',
          name: 'signup',
          component: () => import('@/pages/auth/Signup.vue'),
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/pages/auth/ForgotPassword.vue'),
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('@/pages/auth/ResetPassword.vue'),
        },
      ],
    },

    // 4. App Layout (Main Workspace Management)
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/pages/dashboard/index.vue'),
        },
        {
          path: 'projects',
          name: 'projects',
          redirect: '/dashboard',
        },
        {
          path: 'team',
          name: 'team',
          redirect: '/dashboard',
        },
        {
          path: 'assets',
          name: 'assets',
          component: () => import('@/pages/assets/AssetLibraryPage.vue'),
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/pages/analytics/AnalyticsPage.vue'),
        },

        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/settings/SettingsPage.vue'),
        },
      ],
    },

    {
      path: '/project/:id',
      name: 'project-detail',
      component: () => import('@/pages/projects/ProjectWorkspacePage.vue'),
      meta: { requiresAuth: true, layout: 'DefaultLayout' },
    },
    {
      path: '/projects/:id',
      redirect: (to) => `/project/${to.params.id}`,
    },

    // Fallback catch-all redirect to home
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// Navigation Guard for authentication
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('shine_token');
  if (to.meta.requiresAuth && !token) {
    next({ path: '/auth/login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router;
