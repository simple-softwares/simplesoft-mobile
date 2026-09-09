import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import api from '../../services/api/httpClient';

// ── Helpers ────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function fmtCurrency(n) {
  if (n == null) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const today = () => new Date().toISOString().split('T')[0];

const STATUS_COLOR = {
  draft:     { bg: '#F1F5F9', text: '#64748B' },
  sent:      { bg: '#DBEAFE', text: '#1D4ED8' },
  paid:      { bg: '#DCFCE7', text: '#15803D' },
  overdue:   { bg: '#FEE2E2', text: '#DC2626' },
  cancelled: { bg: '#F1F5F9', text: '#64748B' },
};

// ── Sub-components ─────────────────────────────────────────────

function ERPCard({ label, value, sub, icon, iconBg, iconColor, valColor, onPress }) {
  return (
    <TouchableOpacity style={[ec.card, { borderColor: iconColor + '30' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[ec.iconBox, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={15} color={iconColor} />
      </View>
      <Text style={[ec.val, { color: valColor }]}>{value}</Text>
      <Text style={ec.label}>{label}</Text>
      {sub ? <Text style={ec.sub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

function StatCard({ label, value, icon, iconBg, iconColor, valColor, onPress, colors }) {
  return (
    <TouchableOpacity style={[sc.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.8}>
      <View style={s.statTop}>
        <View style={[sc.iconBox, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={15} color={iconColor} />
        </View>
        <Icon name="chevron-forward" size={13} color={colors.textLight} />
      </View>
      <Text style={[sc.val, { color: valColor }]}>{value ?? 0}</Text>
      <Text style={[sc.label, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, action, onAction, colors }) {
  return (
    <View style={s.sectionHead}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && (
        <TouchableOpacity style={s.seeAllRow} onPress={onAction}>
          <Text style={[s.seeAll, { color: colors.primary }]}>{action}</Text>
          <Icon name="arrow-forward" size={11} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function InvoiceRow({ inv, colors, onPress }) {
  const st = STATUS_COLOR[inv.status] || STATUS_COLOR.draft;
  return (
    <TouchableOpacity style={[s.row, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={s.rowMain}>
        <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>{inv.customer_name}</Text>
        <Text style={[s.rowSub, { color: colors.textSecondary }]}>{inv.invoice_number}</Text>
      </View>
      <View style={[s.badge, { backgroundColor: st.bg }]}>
        <Text style={[s.badgeText, { color: st.text }]}>{inv.status}</Text>
      </View>
      <Text style={[s.rowAmount, { color: colors.text }]}>{fmtCurrency(inv.total)}</Text>
    </TouchableOpacity>
  );
}

function TaskRow({ task, colors, onPress }) {
  const PRIORITY_COLOR = { '1': '#EF4444', '2': '#F59E0B', '3': '#94A3B8', '0': '#94A3B8' };
  const dot = PRIORITY_COLOR[task.priority] || '#94A3B8';
  const overdue = task.date_deadline && task.date_deadline < today();
  return (
    <TouchableOpacity style={[s.row, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.priorityDot, { backgroundColor: dot }]} />
      <View style={s.rowMain}>
        <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>{task.name}</Text>
        <Text style={[s.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {task.project_name || task.project_id?.[1] || 'No project'}
        </Text>
      </View>
      {task.date_deadline && (
        <Text style={[s.rowDate, { color: overdue ? '#EF4444' : colors.textSecondary }]}>
          {fmtDate(task.date_deadline)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const { colors }  = useTheme();
  const user        = useSelector(s => s.auth.user);
  const plan        = useSelector(s => s.plan);
  const selectedMods = plan?.selected_modules || [];
  const hasInvoices  = selectedMods.includes('invoices') || selectedMods.includes('accounting');

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ops,   setOps]   = useState(null);
  const [erp,   setErp]   = useState(null);
  const [tasks, setTasks] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const [opsRes, erpRes] = await Promise.all([
        api.get('/dashboard').catch(e => { console.log('[Dashboard] /dashboard error:', e.response?.status, e.message); return { data: {} }; }),
        hasInvoices ? api.get('/dashboard/erp').catch(e => { console.log('[Dashboard] /erp error:', e.response?.status); return { data: null }; }) : Promise.resolve({ data: null }),
      ]);
      console.log('[Dashboard] ops stats:', JSON.stringify(opsRes.data?.stats));
      console.log('[Dashboard] recent_tasks count:', opsRes.data?.recent_tasks?.length);
      setOps(opsRes.data);
      setTasks(opsRes.data?.recent_tasks || []);
      setErp(erpRes.data);
    } catch (e) { console.log('[Dashboard] load error:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [hasInvoices]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const monthName = new Date().toLocaleString('en-IN', { month: 'long' });
  const firstName = (user?.name || 'User').split(' ')[0];

  const overdueTasks = tasks.filter(t => t.date_deadline && String(t.date_deadline) < today());

  const stats = {
    tasks:    ops?.stats?.open_tasks    ?? ops?.open_tasks    ?? 0,
    projects: ops?.stats?.total_projects ?? ops?.total_projects ?? 0,
    overdue:  ops?.stats?.overdue_tasks  ?? ops?.overdue_tasks  ?? 0,
    contacts: ops?.stats?.total_contacts ?? ops?.total_contacts ?? 0,
  };

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.greeting, { color: colors.textSecondary }]}>
            {greeting()}, {firstName}
          </Text>
          <Text style={[s.dateText, { color: colors.textLight }]}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => navigation.navigate('Search')}>
            <Icon name="search-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => navigation.navigate('Notifications')}>
            <Icon name="notifications-outline" size={20} color={colors.primary} />
            {unread > 0 && (
              <View style={[s.notifBadge, { backgroundColor: colors.error }]}>
                <Text style={s.notifBadgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* ── ERP KPIs ── */}
          {hasInvoices && erp && (
            <View style={s.section}>
              <Text style={[s.sectionCap, { color: colors.textSecondary }]}>
                BUSINESS · {monthName.toUpperCase()}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}>
                <ERPCard
                  label={`Invoiced (${monthName.slice(0, 3)})`}
                  value={fmtCurrency(erp.invoiced_this_month)}
                  sub={erp.paid_this_month != null ? `${fmtCurrency(erp.paid_this_month)} collected` : null}
                  icon="receipt-outline" iconBg="#DBEAFE" iconColor="#1D4ED8" valColor="#1D4ED8"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'InvoicesHome' })}
                />
                <ERPCard
                  label="Outstanding AR"
                  value={fmtCurrency(erp.outstanding_ar)}
                  icon="trending-up-outline" iconBg="#FEF3C7" iconColor="#D97706" valColor="#D97706"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'InvoicesHome' })}
                />
                <ERPCard
                  label="Overdue"
                  value={erp.overdue_count != null ? `${erp.overdue_count} inv` : '—'}
                  sub={erp.overdue_amount ? fmtCurrency(erp.overdue_amount) : null}
                  icon="alert-circle-outline" iconBg="#FEE2E2" iconColor="#DC2626" valColor="#DC2626"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'InvoicesHome' })}
                />
                <ERPCard
                  label="Cash Position"
                  value={fmtCurrency(erp.cash_position)}
                  icon="wallet-outline" iconBg="#DCFCE7" iconColor="#15803D" valColor="#15803D"
                />
                <ERPCard
                  label={`GST Due (${monthName.slice(0, 3)})`}
                  value={fmtCurrency(erp.gst_due_this_month)}
                  icon="pricetag-outline" iconBg="#F3E8FF" iconColor="#7C3AED" valColor="#7C3AED"
                />
                <ERPCard
                  label="Open Quotes"
                  value={erp.open_quotes ?? '—'}
                  icon="document-text-outline" iconBg="#CCFBF1" iconColor="#0F766E" valColor="#0F766E"
                  onPress={() => navigation.navigate('MainTabs', { screen: 'QuotationsHome' })}
                />
              </ScrollView>
            </View>
          )}

          {/* ── Operations stats ── */}
          <View style={s.section}>
            <Text style={[s.sectionCap, { color: colors.textSecondary }]}>OPERATIONS</Text>
            <View style={s.statsGrid}>
              <StatCard
                label="My Tasks" value={stats.tasks}
                icon="checkbox-outline" iconBg="#DBEAFE" iconColor="#2196F3" valColor="#1D4ED8"
                colors={colors} onPress={() => navigation.navigate('Tasks')}
              />
              <StatCard
                label="Projects" value={stats.projects}
                icon="folder-outline" iconBg="#F3E8FF" iconColor="#7C3AED" valColor="#6D28D9"
                colors={colors} onPress={() => navigation.navigate('Projects')}
              />
              <StatCard
                label="Overdue" value={stats.overdue}
                icon="alert-circle-outline" iconBg="#FEE2E2" iconColor="#EF4444" valColor="#DC2626"
                colors={colors} onPress={() => navigation.navigate('Tasks')}
              />
              <StatCard
                label="Contacts" value={stats.contacts}
                icon="people-outline" iconBg="#DCFCE7" iconColor="#10B981" valColor="#059669"
                colors={colors} onPress={() => navigation.navigate('Contacts')}
              />
            </View>
          </View>

          {/* ── Recent Invoices ── */}
          {hasInvoices && erp?.recent_invoices?.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SectionHeader
                title="Recent Invoices" action="View all" colors={colors}
                onAction={() => navigation.navigate('MainTabs', { screen: 'InvoicesHome' })}
              />
              {erp.recent_invoices.map(inv => (
                <InvoiceRow key={inv.id} inv={inv} colors={colors}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'InvoiceDetail', params: { invoiceId: inv.id } })}
                />
              ))}
            </View>
          )}

          {/* ── Recent Tasks ── */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader
              title="Recent Tasks" action="View all" colors={colors}
              onAction={() => navigation.navigate('Tasks')}
            />
            {tasks.length === 0 ? (
              <View style={s.emptyBox}>
                <Icon name="checkbox-outline" size={28} color={colors.textLight} />
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>No tasks yet</Text>
              </View>
            ) : tasks.slice(0, 6).map(t => (
              <TaskRow key={t.id} task={t} colors={colors}
                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: t.id } })}
              />
            ))}
          </View>

          {/* ── Overdue alert ── */}
          {overdueTasks.length > 0 && (
            <TouchableOpacity
              style={s.overdueCard}
              onPress={() => navigation.navigate('Tasks')}
              activeOpacity={0.85}>
              <View style={s.overdueHeader}>
                <Icon name="alert-circle" size={14} color="#DC2626" />
                <Text style={s.overdueTitle}>
                  {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                </Text>
              </View>
              {overdueTasks.slice(0, 3).map(t => (
                <Text key={t.id} style={s.overdueItem} numberOfLines={1}>· {t.name}</Text>
              ))}
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  greeting:     { fontSize: 18, fontWeight: '700' },
  dateText:     { fontSize: 12, marginTop: 2 },
  headerBtns:   { flexDirection: 'row', gap: 8 },
  headerBtn:    { padding: 9, borderRadius: 10, position: 'relative' },
  notifBadge:   { position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14,
                  borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  notifBadgeText:{ fontSize: 8, fontWeight: '800', color: '#fff' },
  loadingBox:   { height: 200, alignItems: 'center', justifyContent: 'center' },
  section:      { marginBottom: 16 },
  sectionCap:   { fontSize: 10, fontWeight: '700', letterSpacing: 1,
                  paddingHorizontal: 16, marginBottom: 10 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  card:         { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  seeAllRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAll:       { fontSize: 12, fontWeight: '600' },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                  paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  rowMain:      { flex: 1, minWidth: 0 },
  rowTitle:     { fontSize: 13, fontWeight: '600' },
  rowSub:       { fontSize: 11, marginTop: 2 },
  rowAmount:    { fontSize: 13, fontWeight: '700', flexShrink: 0 },
  rowDate:      { fontSize: 11, flexShrink: 0 },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, flexShrink: 0 },
  badgeText:    { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  priorityDot:  { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  emptyBox:     { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText:    { fontSize: 13 },
  overdueCard:  { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FEF2F2',
                  borderColor: '#FECACA', borderWidth: 1, borderRadius: 14, padding: 14 },
  overdueHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  overdueTitle: { fontSize: 13, fontWeight: '700', color: '#B91C1C' },
  overdueItem:  { fontSize: 12, color: '#DC2626', marginTop: 2 },
});

const ec = StyleSheet.create({
  card:    { width: 130, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
             padding: 12, gap: 5 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  val:     { fontSize: 17, fontWeight: '800' },
  label:   { fontSize: 10, color: '#64748B', fontWeight: '600' },
  sub:     { fontSize: 10, color: '#64748B' },
});

const sc = StyleSheet.create({
  card:    { width: '47%', borderRadius: 12, borderWidth: 1, padding: 14 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  val:     { fontSize: 22, fontWeight: '800' },
  label:   { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
