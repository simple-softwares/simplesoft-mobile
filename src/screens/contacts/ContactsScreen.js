import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ContactsService from '../../services/contacts/contactsService';
import { useTheme } from '../../theme/ThemeContext';
import { SkeletonList } from '../../components/common/SkeletonLoader';
import { usePermissions } from '../../hooks/usePermissions';
 
const ContactRow = ({ contact, onPress }) => {
  const { colors } = useTheme();
  const color    = ContactsService.getColor(contact.id);
  const initials = ContactsService.getInitials(contact.name);
  const sub      = [contact.jobTitle, contact.companyName].filter(Boolean).join(' · ');
  const phone    = contact.phone || contact.mobile || '';

  const handleCall = (e) => {
    e.stopPropagation();
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone app'));
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (!phone) return;
    const num = phone.replace(/[\s\-\(\)]/g, '');
    Linking.openURL(`https://wa.me/${num}`).catch(() =>
      Alert.alert('Error', 'WhatsApp is not installed'));
  };

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}
      onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        {contact.is_company
          ? <Icon name="business" size={18} color="#fff" />
          : <Text style={styles.avatarText}>{initials}</Text>}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{contact.name}</Text>
        {!!sub && <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text>}
        {!!phone && (
          <Text style={[styles.rowPhone, { color: colors.textLight }]} numberOfLines={1}>{phone}</Text>
        )}
      </View>
      {!!phone && (
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D36615' }]}
            onPress={handleWhatsApp} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Icon name="logo-whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={handleCall} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Icon name="call-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      <Icon name="chevron-forward" size={16} color={colors.textLight} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
};
 
const PAGE_SIZE = 50;

const ContactsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { canCreateContact } = usePermissions(user?.id);
  const [contacts,    setContacts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [page,        setPage]        = useState(0);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('all');
  const timer = useRef(null);

  const load = useCallback(async (q = '', f = filter) => {
    try {
      const data = await ContactsService.list({ search: q, type: f, limit: PAGE_SIZE, offset: 0 });
      setContacts(data || []);
      setPage(0);
      setHasMore((data || []).length === PAGE_SIZE);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await ContactsService.list({ search, type: filter, limit: PAGE_SIZE, offset: next * PAGE_SIZE });
      if ((data || []).length === 0) {
        setHasMore(false);
      } else {
        setContacts(prev => [...prev, ...data]);
        setPage(next);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch {} finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, page, search, filter]);

  useFocusEffect(useCallback(() => {
    // Reset and reload contacts every time screen comes into focus
    setPage(0);
    setHasMore(true);
    load(search, filter);
  }, [load, search, filter]));
 
  const onSearch = (t) => {
    setSearch(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(t), 350);
  };
 
  const FILTERS = [
    { key: 'all',     label: 'All'      },
    { key: 'person',  label: 'People'   },
    { key: 'company', label: 'Companies'},
  ];
 
  if (loading) return <SkeletonList count={8} />;
 
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search-outline" size={17} color={colors.textLight} style={{ marginLeft: 12 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search} onChangeText={onSearch}
          placeholder="Search contacts..." placeholderTextColor={colors.textLight} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); load(''); }} style={{ paddingRight: 10 }}>
            <Icon name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
 
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key}
            style={[styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              filter === f.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { setFilter(f.key); load(search, f.key); }}>
            <Text style={[styles.chipText, { color: filter === f.key ? '#fff' : colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.countText, { color: colors.textLight }]}>{contacts.length} contacts</Text>
      </View>
 
      <FlatList
        data={contacts}
        keyExtractor={c => String(c.id)}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(search); }}
          tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <ContactRow contact={item}
            onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />
        ) : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="people-outline" size={52} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No contacts found</Text>
          </View>
        }
      />
 
      {canCreateContact() && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => navigation.navigate('ContactEdit', { contactId: null })}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};
 
const S = StyleSheet;
const styles = S.create({
  container:   { flex: 1 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow:   { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 },
  filterRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText:    { fontSize: 12, fontWeight: '600' },
  countText:   { marginLeft: 'auto', fontSize: 12 },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: S.hairlineWidth },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  rowContent:  { flex: 1 },
  rowName:     { fontSize: 14, fontWeight: '600' },
  rowSub:      { fontSize: 12, marginTop: 2 },
  rowPhone:    { fontSize: 11, marginTop: 1 },
  actionBtns:  { flexDirection: 'row', gap: 6, marginRight: 4 },
  actionBtn:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:  { fontSize: 15, fontWeight: '700' },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
});
 
export default ContactsScreen;
