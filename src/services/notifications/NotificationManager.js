import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProvisionService from '@services/provision/provisionService';
import store from '@store/index';
import { setPlan } from '@store/slices/planSlice';

/**
 * ============================================================================
 * NOTIFICATION MANAGER
 *
 * Unified notification system for all types of notifications:
 * - Billing: payment_approved, subscription_updated, trial_expiring
 * - Tasks: task_assigned, task_updated, task_comment
 * - Projects: project_update, project_member_added
 * - Team: team_invite, team_member_joined, team_announcement
 * - CRM: lead_assigned, opportunity_update, deal_won
 * - Sales: order_placed, order_shipped, order_delivered
 * - HR: employee_announcement, payroll_ready
 * - Inventory: low_stock, purchase_order, reorder
 * - Custom: user-defined notifications via webhook
 * ============================================================================
 */

// ── NOTIFICATION TYPES & CHANNELS ─────────────────────────────────────────
const NOTIFICATION_TYPES = {
  // Billing
  PAYMENT_APPROVED: 'payment_approved',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  TRIAL_EXPIRING: 'trial_expiring',

  // Tasks
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMMENT: 'task_comment',
  TASK_COMPLETED: 'task_completed',

  // Projects
  PROJECT_UPDATE: 'project_update',
  PROJECT_MEMBER_ADDED: 'project_member_added',
  PROJECT_COMPLETED: 'project_completed',

  // Team
  TEAM_INVITE: 'team_invite',
  TEAM_MEMBER_JOINED: 'team_member_joined',
  TEAM_ANNOUNCEMENT: 'team_announcement',

  // CRM
  LEAD_ASSIGNED: 'lead_assigned',
  OPPORTUNITY_UPDATE: 'opportunity_update',
  DEAL_WON: 'deal_won',

  // Sales
  ORDER_PLACED: 'order_placed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',

  // HR
  EMPLOYEE_ANNOUNCEMENT: 'employee_announcement',
  PAYROLL_READY: 'payroll_ready',

  // Inventory
  LOW_STOCK: 'low_stock',
  PURCHASE_ORDER: 'purchase_order',
  REORDER: 'reorder',

  // System
  SYSTEM_ALERT: 'system_alert',
};

const NOTIFICATION_CHANNELS = {
  billing: 'billing',
  tasks: 'tasks',
  projects: 'projects',
  team: 'team',
  crm: 'crm',
  sales: 'sales',
  hr: 'hr',
  inventory: 'inventory',
  system: 'system',
};

const NOTIFICATION_PRIORITIES = {
  CRITICAL: 'critical',  // Payment, alerts
  HIGH: 'high',          // Task assigned, invite
  MEDIUM: 'medium',      // Updates, comments
  LOW: 'low',            // Announcements
};

// Mapping: notification type → channel
const TYPE_TO_CHANNEL = {
  [NOTIFICATION_TYPES.PAYMENT_APPROVED]: NOTIFICATION_CHANNELS.billing,
  [NOTIFICATION_TYPES.SUBSCRIPTION_UPDATED]: NOTIFICATION_CHANNELS.billing,
  [NOTIFICATION_TYPES.TRIAL_EXPIRING]: NOTIFICATION_CHANNELS.billing,
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: NOTIFICATION_CHANNELS.tasks,
  [NOTIFICATION_TYPES.TASK_UPDATED]: NOTIFICATION_CHANNELS.tasks,
  [NOTIFICATION_TYPES.TASK_COMMENT]: NOTIFICATION_CHANNELS.tasks,
  [NOTIFICATION_TYPES.TASK_COMPLETED]: NOTIFICATION_CHANNELS.tasks,
  [NOTIFICATION_TYPES.PROJECT_UPDATE]: NOTIFICATION_CHANNELS.projects,
  [NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED]: NOTIFICATION_CHANNELS.projects,
  [NOTIFICATION_TYPES.PROJECT_COMPLETED]: NOTIFICATION_CHANNELS.projects,
  [NOTIFICATION_TYPES.TEAM_INVITE]: NOTIFICATION_CHANNELS.team,
  [NOTIFICATION_TYPES.TEAM_MEMBER_JOINED]: NOTIFICATION_CHANNELS.team,
  [NOTIFICATION_TYPES.TEAM_ANNOUNCEMENT]: NOTIFICATION_CHANNELS.team,
  [NOTIFICATION_TYPES.LEAD_ASSIGNED]: NOTIFICATION_CHANNELS.crm,
  [NOTIFICATION_TYPES.OPPORTUNITY_UPDATE]: NOTIFICATION_CHANNELS.crm,
  [NOTIFICATION_TYPES.DEAL_WON]: NOTIFICATION_CHANNELS.crm,
  [NOTIFICATION_TYPES.ORDER_PLACED]: NOTIFICATION_CHANNELS.sales,
  [NOTIFICATION_TYPES.ORDER_SHIPPED]: NOTIFICATION_CHANNELS.sales,
  [NOTIFICATION_TYPES.ORDER_DELIVERED]: NOTIFICATION_CHANNELS.sales,
  [NOTIFICATION_TYPES.EMPLOYEE_ANNOUNCEMENT]: NOTIFICATION_CHANNELS.hr,
  [NOTIFICATION_TYPES.PAYROLL_READY]: NOTIFICATION_CHANNELS.hr,
  [NOTIFICATION_TYPES.LOW_STOCK]: NOTIFICATION_CHANNELS.inventory,
  [NOTIFICATION_TYPES.PURCHASE_ORDER]: NOTIFICATION_CHANNELS.inventory,
  [NOTIFICATION_TYPES.REORDER]: NOTIFICATION_CHANNELS.inventory,
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: NOTIFICATION_CHANNELS.system,
};

// Icon mapping for notification types
const TYPE_ICONS = {
  [NOTIFICATION_TYPES.PAYMENT_APPROVED]: 'checkmark-circle',
  [NOTIFICATION_TYPES.SUBSCRIPTION_UPDATED]: 'refresh-circle',
  [NOTIFICATION_TYPES.TRIAL_EXPIRING]: 'warning',
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'checkmark-square',
  [NOTIFICATION_TYPES.TASK_UPDATED]: 'create',
  [NOTIFICATION_TYPES.TASK_COMMENT]: 'chatbubble',
  [NOTIFICATION_TYPES.TASK_COMPLETED]: 'checkmark-done',
  [NOTIFICATION_TYPES.PROJECT_UPDATE]: 'folder',
  [NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED]: 'person-add',
  [NOTIFICATION_TYPES.PROJECT_COMPLETED]: 'checkmark-circle',
  [NOTIFICATION_TYPES.TEAM_INVITE]: 'person-add',
  [NOTIFICATION_TYPES.TEAM_MEMBER_JOINED]: 'person',
  [NOTIFICATION_TYPES.TEAM_ANNOUNCEMENT]: 'megaphone',
  [NOTIFICATION_TYPES.LEAD_ASSIGNED]: 'person-circle',
  [NOTIFICATION_TYPES.OPPORTUNITY_UPDATE]: 'trending-up',
  [NOTIFICATION_TYPES.DEAL_WON]: 'star',
  [NOTIFICATION_TYPES.ORDER_PLACED]: 'bag',
  [NOTIFICATION_TYPES.ORDER_SHIPPED]: 'truck',
  [NOTIFICATION_TYPES.ORDER_DELIVERED]: 'home',
  [NOTIFICATION_TYPES.EMPLOYEE_ANNOUNCEMENT]: 'megaphone',
  [NOTIFICATION_TYPES.PAYROLL_READY]: 'cash',
  [NOTIFICATION_TYPES.LOW_STOCK]: 'alert-circle',
  [NOTIFICATION_TYPES.PURCHASE_ORDER]: 'document',
  [NOTIFICATION_TYPES.REORDER]: 'refresh-circle',
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'alert-circle',
};

class NotificationManager {
  constructor() {
    this.token = null;
    this.listeners = {};
    this.appStateSubscription = null;
  }

  // ────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ────────────────────────────────────────────────────────────────────────

  async initialize(userId, userEmail) {

    // Respect user's notification toggle
    const enabled = await AsyncStorage.getItem('notif_enabled');
    if (enabled === 'false') return false;

    try {
      // Create notification channels
      await this.createChannels();

      // Request permissions
      const authStatus = await messaging().requestPermission();
      const isAuthorized =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!isAuthorized) {
        return false;
      }

      // Get FCM token
      this.token = await messaging().getToken();
      if (this.token) {
        await AsyncStorage.setItem('fcm_token', this.token);
        await this.registerToken(userId, this.token, userEmail);
      }

      // Token refresh listener
      this.listeners.tokenRefresh = messaging().onTokenRefresh(async newToken => {
        this.token = newToken;
        await AsyncStorage.setItem('fcm_token', newToken);
        await this.registerToken(userId, newToken, userEmail);
      });

      // Message handlers
      this.setupMessageHandlers();

      // App state listener
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

      return true;
    } catch (error) {
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // CHANNEL SETUP
  // ────────────────────────────────────────────────────────────────────────

  async createChannels() {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        id: NOTIFICATION_CHANNELS.billing,
        name: 'Billing & Payments',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.tasks,
        name: 'Tasks',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.projects,
        name: 'Projects',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.team,
        name: 'Team',
        importance: AndroidImportance.DEFAULT,
        vibration: true,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.crm,
        name: 'CRM',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.sales,
        name: 'Sales',
        importance: AndroidImportance.DEFAULT,
        vibration: false,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.hr,
        name: 'HR',
        importance: AndroidImportance.DEFAULT,
        vibration: false,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.inventory,
        name: 'Inventory',
        importance: AndroidImportance.DEFAULT,
        vibration: false,
        sound: 'default',
      },
      {
        id: NOTIFICATION_CHANNELS.system,
        name: 'System',
        importance: AndroidImportance.LOW,
        vibration: false,
        sound: 'default',
      },
    ];

    for (const channel of channels) {
      await notifee.createChannel({
        id: channel.id,
        name: channel.name,
        importance: channel.importance,
        vibration: channel.vibration,
        sound: channel.sound,
        visibility: AndroidVisibility.PUBLIC,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // TOKEN REGISTRATION
  // ────────────────────────────────────────────────────────────────────────

  async registerToken(userId, token, userEmail) {
    try {
      await ProvisionService.registerFCMToken(userId, token, userEmail);
    } catch (error) {
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // MESSAGE HANDLERS
  // ────────────────────────────────────────────────────────────────────────

  setupMessageHandlers() {
    // Foreground message handler
    this.listeners.foreground = messaging().onMessage(async remoteMessage => {
      await this.handleForegroundMessage(remoteMessage);
    });

    // Background message handler
    this.listeners.background = messaging().setBackgroundMessageHandler(
      async remoteMessage => {
        await this.handleBackgroundMessage(remoteMessage);
      }
    );

    // Notification opened (app in background)
    this.listeners.notificationOpened = messaging().onNotificationOpenedApp(
      remoteMessage => {
        this.handleNotificationTap(remoteMessage?.data || {});
      }
    );

    // App opened from notification (killed state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          setTimeout(() => this.handleNotificationTap(remoteMessage?.data || {}), 1000);
        }
      });
  }

  async handleForegroundMessage(remoteMessage) {
    const { title, body } = remoteMessage.notification || {};
    const data = remoteMessage.data || {};


    // Handle notification-specific logic
    await this.handleNotificationLogic(data);

    // Display local notification
    await this.displayLocalNotification({
      title: title || 'SimpleSoft Workspace',
      body: body || 'You have a new notification',
      data,
    });
  }

  async handleBackgroundMessage(remoteMessage) {
    const data = remoteMessage.data || {};

    // Handle notification-specific logic even in background
    await this.handleNotificationLogic(data);
  }

  async displayLocalNotification({ title, body, data }) {
    const enabled = await AsyncStorage.getItem('notif_enabled');
    if (enabled === 'false') return;

    try {
      const channelId = TYPE_TO_CHANNEL[data.type] || NOTIFICATION_CHANNELS.system;

      await notifee.displayNotification({
        title: title || 'SimpleSoft',
        body: body || '',
        data,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
          actions: this.getActionsForType(data.type),
        },
        ios: {
          sound: 'default',
        },
      });

      // Store in history
      await this.storeNotification({ title, body, data });
    } catch (error) {
    }
  }

  getActionsForType(type) {
    const actionsMap = {
      [NOTIFICATION_TYPES.TASK_ASSIGNED]: [{ title: 'View', pressAction: { id: 'view' } }],
      [NOTIFICATION_TYPES.TASK_COMMENT]: [{ title: 'View', pressAction: { id: 'view' } }],
      [NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED]: [{ title: 'View Project', pressAction: { id: 'view' } }],
      [NOTIFICATION_TYPES.TEAM_INVITE]: [{ title: 'Join', pressAction: { id: 'view' } }],
      [NOTIFICATION_TYPES.LEAD_ASSIGNED]: [{ title: 'View', pressAction: { id: 'view' } }],
    };
    return actionsMap[type] || [];
  }

  // ────────────────────────────────────────────────────────────────────────
  // NOTIFICATION LOGIC HANDLERS
  // ────────────────────────────────────────────────────────────────────────

  async handleNotificationLogic(data) {
    const type = data.type || data.action;

    // Billing notifications
    if (type === NOTIFICATION_TYPES.PAYMENT_APPROVED) {
      await this.handlePaymentApproved(data);
    }
    if (type === NOTIFICATION_TYPES.SUBSCRIPTION_UPDATED) {
      await this.handleSubscriptionUpdated(data);
    }

    // Task notifications
    if ([NOTIFICATION_TYPES.TASK_ASSIGNED, NOTIFICATION_TYPES.TASK_COMMENT].includes(type)) {
      // Store in AsyncStorage for navigation
      await AsyncStorage.setItem('pending_notification', JSON.stringify({
        type,
        taskId: data.task_id,
        model: 'task.task',
        id: data.task_id,
      }));
    }

    // Project notifications
    if (type === NOTIFICATION_TYPES.PROJECT_UPDATE || type === NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED) {
      await AsyncStorage.setItem('pending_notification', JSON.stringify({
        type,
        projectId: data.project_id,
        model: 'project.project',
        id: data.project_id,
      }));
    }

    // CRM notifications
    if ([NOTIFICATION_TYPES.LEAD_ASSIGNED, NOTIFICATION_TYPES.OPPORTUNITY_UPDATE].includes(type)) {
      await AsyncStorage.setItem('pending_notification', JSON.stringify({
        type,
        leadId: data.lead_id,
        model: 'crm.lead',
        id: data.lead_id,
      }));
    }

    // Custom handler for user-defined notifications
    if (data.custom_handler) {
      await this.executeCustomHandler(data);
    }
  }

  async handlePaymentApproved(data) {

    try {
      const slug = data.slug || store.getState().workspace?.slug;
      if (!slug) return;

      const subscription = await ProvisionService.getSubscription(slug);
      store.dispatch(setPlan({
        modules: subscription.modules || [],
        enabled_modules: subscription.modules || [],
        ...subscription,
      }));

      await AsyncStorage.setItem('navigate_to', 'Modules');
    } catch (error) {
    }
  }

  async handleSubscriptionUpdated(data) {

    try {
      const slug = data.slug || store.getState().workspace?.slug;
      if (!slug) return;

      const subscription = await ProvisionService.getSubscription(slug);
      store.dispatch(setPlan(subscription));

      await AsyncStorage.setItem('navigate_to', 'Subscription');
    } catch (error) {
    }
  }

  async executeCustomHandler(data) {
    // For future custom notification handlers
    const { custom_handler, ...params } = data;
  }

  // ────────────────────────────────────────────────────────────────────────
  // TAP HANDLING & NAVIGATION
  // ────────────────────────────────────────────────────────────────────────

  async handleNotificationTap(data) {
    const type = data.type || data.action;

    // Store for navigation
    if (data.model && data.id) {
      await AsyncStorage.setItem('pending_notification', JSON.stringify(data));
    }
  }

  navigateFromNotification(navigation, data) {
    if (!navigation || !data) return;

    const type = data.type || data.action;

    // Helper: navigate into a module tab then push a detail screen
    const toModule = (tabName, screen, params) => {
      try {
        navigation.navigate('MainTabs', { screen: tabName });
        if (screen) {
          setTimeout(() => navigation.navigate(screen, params), 300);
        }
      } catch {
        try { navigation.navigate('Dashboard'); } catch {}
      }
    };

    const navigationMap = {
      // Tasks
      [NOTIFICATION_TYPES.TASK_ASSIGNED]: () =>
        navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: Number(data.task_id) } }),
      [NOTIFICATION_TYPES.TASK_COMMENT]: () =>
        navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: Number(data.task_id) } }),
      [NOTIFICATION_TYPES.TASK_UPDATED]: () =>
        navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: Number(data.task_id) } }),
      // Projects
      [NOTIFICATION_TYPES.PROJECT_UPDATE]: () =>
        navigation.navigate('Projects', { screen: 'ProjectDetail', params: { projectId: Number(data.project_id) } }),
      [NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED]: () =>
        navigation.navigate('Projects', { screen: 'ProjectDetail', params: { projectId: Number(data.project_id) } }),
      // Team / Settings
      [NOTIFICATION_TYPES.TEAM_INVITE]: () =>
        navigation.navigate('Settings'),
      [NOTIFICATION_TYPES.PAYMENT_APPROVED]: () =>
        navigation.navigate('Settings'),
      [NOTIFICATION_TYPES.SUBSCRIPTION_UPDATED]: () =>
        navigation.navigate('Settings'),
      // CRM
      [NOTIFICATION_TYPES.LEAD_ASSIGNED]: () =>
        toModule('CRMLeads', data.lead_id ? 'LeadDetail' : null, { id: Number(data.lead_id) }),
      [NOTIFICATION_TYPES.OPPORTUNITY_UPDATE]: () =>
        toModule('CRMLeads', data.lead_id ? 'LeadDetail' : null, { id: Number(data.lead_id) }),
      [NOTIFICATION_TYPES.DEAL_WON]: () =>
        toModule('CRMLeads'),
      // Service tickets
      service_ticket_assigned: () =>
        toModule('Service', data.ticket_id ? 'ServiceDetail' : null, { id: Number(data.ticket_id) }),
      service_ticket_updated: () =>
        toModule('Service', data.ticket_id ? 'ServiceDetail' : null, { id: Number(data.ticket_id) }),
      // Helpdesk
      helpdesk_ticket_assigned: () =>
        toModule('Helpdesk', data.ticket_id ? 'HelpdeskDetail' : null, { id: Number(data.ticket_id) }),
      helpdesk_ticket_reply: () =>
        toModule('Helpdesk', data.ticket_id ? 'HelpdeskDetail' : null, { id: Number(data.ticket_id) }),
      // Expenses
      expense_approved: () =>
        toModule('Expenses', data.expense_id ? 'ExpenseDetail' : null, { id: Number(data.expense_id) }),
      expense_rejected: () =>
        toModule('Expenses', data.expense_id ? 'ExpenseDetail' : null, { id: Number(data.expense_id) }),
      // Payroll
      [NOTIFICATION_TYPES.PAYROLL_READY]: () =>
        toModule('Payroll'),
      // Inventory
      [NOTIFICATION_TYPES.LOW_STOCK]: () =>
        toModule('InventoryProducts'),
    };

    const handler = navigationMap[type];
    if (handler) {
      try {
        handler();
      } catch (error) {
        try {
          navigation.jumpTo('Dashboard');
        } catch (fallbackError) {
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // NOTIFICATION HISTORY
  // ────────────────────────────────────────────────────────────────────────

  async storeNotification({ title, body, data }) {
    try {
      const history = await this.getNotifications();
      history.unshift({
        id: Date.now(),
        title: title || 'Notification',
        body: body || '',
        type: data.type,
        data,
        timestamp: new Date().toISOString(),
        read: false,
      });

      if (history.length > 100) history.splice(100);
      await AsyncStorage.setItem('notification_history', JSON.stringify(history));
    } catch (error) {
    }
  }

  async getNotifications() {
    try {
      const raw = await AsyncStorage.getItem('notification_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async markAsRead(notificationId) {
    try {
      const history = await this.getNotifications();
      const updated = history.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem('notification_history', JSON.stringify(updated));
    } catch (error) {
    }
  }

  async markAllRead() {
    try {
      const history = await this.getNotifications();
      const updated = history.map(n => ({ ...n, read: true }));
      await AsyncStorage.setItem('notification_history', JSON.stringify(updated));
    } catch (error) {
    }
  }

  async getUnreadCount() {
    const history = await this.getNotifications();
    return history.filter(n => !n.read).length;
  }

  async clearAll() {
    try {
      await notifee.cancelAllNotifications();
      await AsyncStorage.setItem('notification_history', JSON.stringify([]));
    } catch (error) {
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // BADGE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────

  async setBadgeCount(count) {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
    }
  }

  async updateBadge() {
    const unreadCount = await this.getUnreadCount();
    await this.setBadgeCount(unreadCount);
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  // ────────────────────────────────────────────────────────────────────────
  // APP STATE HANDLING
  // ────────────────────────────────────────────────────────────────────────

  handleAppStateChange(state) {
    if (state === 'active') {
      this.clearBadge();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ────────────────────────────────────────────────────────────────────────

  cleanup() {
    Object.values(this.listeners).forEach(listener => {
      if (typeof listener === 'function') listener();
    });
    this.appStateSubscription?.remove();
  }

  // ────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ────────────────────────────────────────────────────────────────────────

  async enableNotifications() {
    await AsyncStorage.setItem('notif_enabled', 'true');
  }

  async disableNotifications() {
    await AsyncStorage.setItem('notif_enabled', 'false');
  }

  async areNotificationsEnabled() {
    const value = await AsyncStorage.getItem('notif_enabled');
    return value !== 'false';
  }
}

export default new NotificationManager();
export { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS, NOTIFICATION_PRIORITIES };
