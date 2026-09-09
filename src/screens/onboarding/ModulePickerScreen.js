import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import ProvisionService from '../../services/provision/provisionService';
import PricingService from '../../services/billing/pricingService';
 
const ModuleCard = ({ id, info, selected, onToggle }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[s.moduleCard,
        { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
        selected && { backgroundColor: colors.primary + '08' }]}
      onPress={() => onToggle(id)}
      activeOpacity={0.8}>
      <View style={[s.moduleIcon, { backgroundColor: selected ? colors.primary + '20' : colors.background }]}>
        <Icon name={info.icon} size={20} color={selected ? colors.primary : colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.moduleName, { color: colors.text }]}>{info.name}</Text>
        <Text style={[s.modulePrice, { color: colors.primary }]}>
          {info.price === 0 ? 'Free' : `₹${info.price}/mo`}
        </Text>
      </View>
      <View style={[s.checkbox,
        { borderColor: selected ? colors.primary : colors.border },
        selected && { backgroundColor: colors.primary }]}>
        {selected && <Icon name="checkmark" size={13} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
};
 
const ModulePickerScreen = ({ route, navigation }) => {
  const { payload } = route.params;
  const { colors } = useTheme();
  const [modules,   setModules]   = useState({});
  const [categories, setCategories] = useState([]);
  const [selected,  setSelected]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    const loadModules = async () => {
      try {
        // Fetch fresh pricing modules from API (skipCache=true for latest prices)
        const moduleList = await PricingService.getModules(null, true);
        // Convert array to object keyed by module key for backward compatibility
        const modulesObj = moduleList.reduce((acc, mod) => {
          // Capitalize category to match CATEGORIES array (sales → Sales, operations → Operations)
          const capitalizedCategory = (mod.category || 'sales').charAt(0).toUpperCase() +
                                      (mod.category || 'sales').slice(1);
          acc[mod.key] = {
            name: mod.name,
            icon: mod.icon || 'cube-outline',
            price: mod.price || 0,
            category: capitalizedCategory,
            description: mod.description || '',
          };
          return acc;
        }, {});
        setModules(modulesObj);

        // Extract unique categories from modules and sort
        const uniqueCategories = [...new Set(Object.values(modulesObj).map(m => m.category))].sort();
        setCategories(uniqueCategories);
        if (uniqueCategories.length > 0) {
          setActiveTab(uniqueCategories[0]);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    loadModules();
  }, []);
 
  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
 
  const totalPrice = selected.reduce((sum, id) => {
    return sum + (modules[id]?.price || 0);
  }, 0);
 
  const handleCreate = async () => {
  setSubmitting(true);
  try {
    const finalPayload = { ...payload, modules: selected };
    const res = await ProvisionService.provision(finalPayload);

    const jobId = res.job_id || `sync-${res.workspace_id || res.slug}`;
    navigation.navigate('WorkspaceLoading', {
      jobId:   jobId,
      slug:    res.slug,
      payload: finalPayload,
      isSyncCreation: !res.job_id,
    });
  } catch (e) {
    Alert.alert('Error', friendlyError(e));
  } finally { setSubmitting(false); }
};
 
  const categoryModules = Object.entries(modules)
    .filter(([, info]) => info.category === activeTab);
 
  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
 
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Choose modules</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            Core features always included free
          </Text>
        </View>
      </View>
 
      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.tabs, { borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}>
        {categories.map(cat => (
          <TouchableOpacity key={cat}
            style={[s.tab,
              { borderColor: activeTab === cat ? colors.primary : colors.border },
              activeTab === cat && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab(cat)}>
            <Text style={[s.tabText, { color: activeTab === cat ? '#fff' : colors.textSecondary }]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
 
      {/* Module list */}
      <ScrollView style={s.list} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 140 }}>
        {/* Core modules badge */}
        {activeTab === categories[0] && (
          <View style={[s.coreBadge, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <Icon name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={[s.coreText, { color: colors.success }]}>
              Tasks, Projects, Notes, Contacts, Team — always included free
            </Text>
          </View>
        )}
 
        {categoryModules.length === 0
          ? <Text style={[s.emptyText, { color: colors.textLight }]}>No modules in this category</Text>
          : categoryModules.map(([id, info]) => (
              <ModuleCard key={id} id={id} info={info}
                selected={selected.includes(id)}
                onToggle={toggle} />
            ))
        }
      </ScrollView>
 
      {/* Footer — price + create button */}
      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={[s.footerLabel, { color: colors.textSecondary }]}>Monthly total</Text>
          <Text style={[s.footerPrice, { color: colors.text }]}>
            {totalPrice === 0 ? 'Free' : `₹${totalPrice}/month`}
            {selected.length > 0 && (
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                {' '}· {selected.length} module{selected.length > 1 ? 's' : ''}
              </Text>
            )}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
          onPress={handleCreate} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.createBtnText}>Create workspace →</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};
 
const S = StyleSheet;
const s = S.create({
  container:    { flex: 1 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: S.hairlineWidth },
  headerTitle:  { fontSize: 16, fontWeight: '700' },
  headerSub:    { fontSize: 12, marginTop: 2 },
  tabs:         { borderBottomWidth: S.hairlineWidth, maxHeight: 56, flexGrow: 0 },
  tab:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabText:      { fontSize: 13, fontWeight: '600' },
  list:         { flex: 1 },
  coreBadge:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  coreText:     { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  emptyText:    { textAlign: 'center', padding: 32, fontSize: 14 },
  moduleCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  moduleIcon:   { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleName:   { fontSize: 14, fontWeight: '600' },
  modulePrice:  { fontSize: 12, fontWeight: '500', marginTop: 2 },
  checkbox:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: S.hairlineWidth },
  footerLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  footerPrice:  { fontSize: 20, fontWeight: '800', marginTop: 2 },
  createBtn:    { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13 },
  createBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
});
 
export default ModulePickerScreen;
