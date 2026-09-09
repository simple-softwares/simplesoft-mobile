import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput,
  FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import TeamService from '../../services/team/teamService';
import Avatar from './Avatar';
import { useTheme } from '../../theme/ThemeContext';

/**
 * MemberPicker — bottom sheet for selecting one or multiple team members
 *
 * Props:
 *   visible       bool
 *   onClose       () => void
 *   onSelect      (users: User[]) => void
 *   selectedIds   number[]          — pre-selected user ids
 *   multi         bool              — allow multiple selection
 *   title         string
 */
const MemberPicker = ({
  visible, onClose, onSelect,
  selectedIds = [], multi = true,
  title = 'Assign to',
}) => {
  const { colors } = useTheme();
  const [members, setMembers] = useState([]);
  const [search,  setSearch]  = useState('');
  const [sel,     setSel]     = useState(new Set(selectedIds));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setSel(new Set(selectedIds));
      loadMembers();
    }
  }, [visible]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await TeamService.getMembers();
      setMembers(data);
    } catch {} finally { setLoading(false); }
  };

  const filtered = members.filter(m =>
    !search.trim() ||
    (m.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.login || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    if (!multi) {
      setSel(new Set([id]));
      const user = members.find(m => m.id === id);
      onSelect(user ? [user] : []);
      onClose();
      return;
    }
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  };

  const confirm = () => {
    const selected = members.filter(m => sel.has(m.id));
    onSelect(selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>

          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: colors.text }]}>{title}</Text>
            {multi && sel.size > 0 && (
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: colors.primary }]} onPress={confirm}>
                <Text style={s.confirmText}>Done ({sel.size})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={[s.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Icon name="search-outline" size={16} color={colors.textLight} style={{ marginLeft: 12 }} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search team members..."
              placeholderTextColor={colors.textLight}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 10 }}>
                <Icon name="close-circle" size={16} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading team...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={m => String(m.id)}
              style={s.list}
              renderItem={({ item }) => {
                const selected = sel.has(item.id);
                return (
                  <TouchableOpacity
                    style={[s.memberRow, selected && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.75}>
                    <Avatar user={item} size={42} />
                    <View style={s.memberInfo}>
                      <Text style={[s.memberName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[s.memberSub, { color: colors.textSecondary }]}>
                        {item.phone || item.email || item.login || ''}
                        {item.task_count > 0 && ` · ${item.task_count} tasks`}
                      </Text>
                    </View>
                    {selected
                      ? <View style={[s.checkCircle, { backgroundColor: colors.primary }]}>
                          <Icon name="checkmark" size={14} color="#fff" />
                        </View>
                      : <View style={[s.emptyCircle, { borderColor: colors.border }]} />
                    }
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No members found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'flex-end' },
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 32 },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  title:       { fontSize: 16, fontWeight: '700' },
  confirmBtn:  { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 100, borderWidth: 1 },
  searchInput: { flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 14 },
  list:        { paddingHorizontal: 16 },
  memberRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: 8, paddingHorizontal: 8, marginBottom: 2 },
  memberInfo:  { flex: 1, marginLeft: 8 },
  memberName:  { fontSize: 14, fontWeight: '600' },
  memberSub:   { fontSize: 12, marginTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5 },
  loadingWrap: { alignItems: 'center', padding: 24, gap: 10 },
  loadingText: { fontSize: 14 },
  empty:       { alignItems: 'center', padding: 24 },
  emptyText:   { fontSize: 14 },
});

export default MemberPicker;
