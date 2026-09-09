import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GUIDES = [
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    icon: 'home-outline',
    category: 'Getting Started',
    difficulty: 'Beginner',
    readingTime: 2,
    content: 'Your dashboard is the central hub where you can see all important information at a glance.',
    details: [
      'View task counts and project status at a glance',
      'Check recent activities and team information',
      'Use the refresh button to update data',
      'Monitor important notifications in real-time',
    ],
    action: { label: 'Go to Dashboard', screen: 'Home' },
    relatedGuides: ['tasks', 'projects'],
  },
  {
    id: 'tasks',
    title: 'Managing Tasks',
    icon: 'checkbox-outline',
    category: 'Features',
    difficulty: 'Beginner',
    readingTime: 3,
    content: 'Create, edit, and track tasks with ease and efficiency.',
    details: [
      'Create new tasks with title, description, and due dates',
      'Assign tasks to team members and set priorities',
      'Track progress with status updates',
      'Use filters to find specific tasks quickly',
      'Mark tasks as done when completed',
      'Sync across all your devices automatically',
    ],
    action: { label: 'Go to Tasks', screen: 'Tasks' },
    relatedGuides: ['projects', 'team'],
  },
  {
    id: 'projects',
    title: 'Projects Management',
    icon: 'folder-outline',
    category: 'Features',
    difficulty: 'Intermediate',
    readingTime: 4,
    content: 'Organize your work into projects for better management.',
    details: [
      'Create projects to group related tasks together',
      'Assign team members to work on projects',
      'Track project-level progress and milestones',
      'View task breakdown by status and stages',
      'Monitor team workload across projects',
    ],
    action: { label: 'Go to Projects', screen: 'Projects' },
    relatedGuides: ['tasks', 'team'],
  },
  {
    id: 'contacts',
    title: 'Contacts & CRM',
    icon: 'people-outline',
    category: 'Features',
    difficulty: 'Beginner',
    readingTime: 2,
    content: 'Maintain a centralized contact database for your business.',
    details: [
      'Add company and personal contacts with details',
      'Store phone numbers, emails, and addresses',
      'Add custom fields for additional information',
      'Search and filter contacts quickly',
      'Export contact information as needed',
    ],
    action: { label: 'Go to Contacts', screen: 'Contacts' },
    relatedGuides: ['team'],
  },
  {
    id: 'notes',
    title: 'Notes & Documentation',
    icon: 'document-text-outline',
    category: 'Features',
    difficulty: 'Beginner',
    readingTime: 2,
    content: 'Create and organize notes with easy categorization.',
    details: [
      'Create personal notes and meeting minutes',
      'Organize notes by categories and tags',
      'Keep project documentation in one place',
      'Search notes by title and content',
      'Share notes with team members',
    ],
    action: { label: 'Go to Notes', screen: 'Notes' },
    relatedGuides: ['projects'],
  },
  {
    id: 'team',
    title: 'Team Collaboration',
    icon: 'shield-outline',
    category: 'Advanced',
    difficulty: 'Intermediate',
    readingTime: 5,
    content: 'Manage your team and collaborative workflows.',
    details: [
      'Invite team members to your workspace',
      'Assign roles: Admin, Manager, Member',
      'View member profiles and task assignments',
      'Monitor team workload and capacity',
      'Manage permissions and access levels',
      'Review team performance and metrics',
    ],
    action: { label: 'Go to Team', screen: 'Team' },
    relatedGuides: ['dashboard', 'tasks'],
  },
  {
    id: 'offline',
    title: 'Offline Mode',
    icon: 'wifi-outline',
    category: 'Advanced',
    difficulty: 'Intermediate',
    readingTime: 3,
    content: 'Work seamlessly without internet connection.',
    details: [
      'Continue working with offline functionality',
      'All changes are saved locally on your device',
      'Automatic sync when connection is restored',
      'Offline status banner appears at the top',
      'No data loss - everything syncs safely',
    ],
    action: null,
    relatedGuides: [],
  },
  {
    id: 'settings',
    title: 'Settings & Preferences',
    icon: 'settings-outline',
    category: 'Getting Started',
    difficulty: 'Beginner',
    readingTime: 2,
    content: 'Customize your workspace experience.',
    details: [
      'Change between light and dark themes',
      'Select your preferred language',
      'Manage notification preferences',
      'Update profile information and avatar',
      'Change password and security settings',
      'Review privacy and data settings',
    ],
    action: { label: 'Go to Settings', screen: 'Settings' },
    relatedGuides: [],
  },
];

const GuideCard = ({ guide, isExpanded, onPress, colors, isRead }) => {
  const getDifficultyColor = () => {
    switch (guide.difficulty) {
      case 'Beginner':     return '#4CAF50';
      case 'Intermediate': return '#FF9800';
      case 'Advanced':     return '#F44336';
      default:             return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[s.guideCard, { backgroundColor: colors.surface, borderColor: isRead ? colors.primary + '40' : colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={s.guideHeader}>
        <View style={[s.guideIcon, { backgroundColor: colors.primary + '15' }]}>
          <Icon name={guide.icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={[s.guideTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              {guide.title}
            </Text>
            {isRead && <Icon name="checkmark-done-circle" size={16} color={colors.primary} style={{ marginLeft: 8 }} />}
          </View>
          <View style={s.metaRow}>
            <View style={[s.difficultyBadge, { backgroundColor: getDifficultyColor() + '25' }]}>
              <Text style={[s.difficultyText, { color: getDifficultyColor() }]}>{guide.difficulty}</Text>
            </View>
            <Text style={[s.readingTime, { color: colors.textSecondary }]}>
              {guide.readingTime} min read
            </Text>
          </View>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
          color={colors.textSecondary}
        />
      </View>

      {isExpanded && (
        <View style={s.expandedContent}>
          <Text style={[s.guideContent, { color: colors.textSecondary }]}>
            {guide.content}
          </Text>

          <View style={s.detailsList}>
            {guide.details.map((detail, idx) => (
              <View key={idx} style={s.detailItem}>
                <Text style={[s.detailBullet, { color: colors.primary }]}>•</Text>
                <Text style={[s.detailText, { color: colors.text, flex: 1 }]}>{detail}</Text>
              </View>
            ))}
          </View>

          {guide.action && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={guide.action.onPress}>
              <Icon name="arrow-forward-outline" size={16} color="#fff" />
              <Text style={s.actionBtnText}>{guide.action.label}</Text>
            </TouchableOpacity>
          )}

          {guide.relatedGuides.length > 0 && (
            <View style={s.relatedSection}>
              <Text style={[s.relatedTitle, { color: colors.text }]}>Related Guides</Text>
              <View style={s.relatedList}>
                {guide.relatedGuides.map((relatedId) => {
                  const related = GUIDES.find((g) => g.id === relatedId);
                  return (
                    <View key={relatedId} style={[s.relatedBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <Icon name={related.icon} size={14} color={colors.primary} />
                      <Text style={[s.relatedText, { color: colors.primary }]}>{related.title}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const HowToGuideScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [readGuides, setReadGuides] = useState(new Set());

  const categories = ['All', ...new Set(GUIDES.map((g) => g.category))];

  const filteredGuides = GUIDES.filter((guide) => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guide.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExpandGuide = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setReadGuides((prev) => new Set([...prev, id]));
    }
  };

  const groupedGuides = {};
  filteredGuides.forEach((guide) => {
    if (!groupedGuides[guide.category]) groupedGuides[guide.category] = [];
    groupedGuides[guide.category].push(guide);
  });

  const progressPercent = Math.round((readGuides.size / GUIDES.length) * 100);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>How to Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={[s.progressBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={s.progressContent}>
          <Text style={[s.progressText, { color: colors.textSecondary }]}>Progress</Text>
          <View style={[s.progressTrack, { backgroundColor: colors.inputBackground }]}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[s.progressPercent, { color: colors.primary }]}>{progressPercent}%</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search guides..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll}>
          <View style={s.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  s.categoryPill,
                  {
                    backgroundColor: selectedCategory === cat ? colors.primary : colors.surface,
                    borderColor: selectedCategory === cat ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}>
                <Text
                  style={[
                    s.categoryText,
                    { color: selectedCategory === cat ? '#fff' : colors.textSecondary },
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Guides by Category */}
        {Object.entries(groupedGuides).map(([category, guides]) => (
          <View key={category} style={s.categorySection}>
            <Text style={[s.categoryTitle, { color: colors.text }]}>{category}</Text>
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                isExpanded={expandedId === guide.id}
                onPress={() => handleExpandGuide(guide.id)}
                colors={colors}
                isRead={readGuides.has(guide.id)}
              />
            ))}
          </View>
        ))}

        {filteredGuides.length === 0 && (
          <View style={s.emptyState}>
            <Icon name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No guides found</Text>
          </View>
        )}

        {/* Pro Tips */}
        <View style={[s.tipsSection, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Icon name="sparkles-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.tipsTitle, { color: colors.primary }]}>💡 Pro Tips</Text>
            <Text style={[s.tipsText, { color: colors.primary }]}>
              • Use search to quickly find guides{'\n'}
              • Read guides to track your progress{'\n'}
              • Check related guides for more info{'\n'}
              • Explore all categories to master the app
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:            { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  progressBar:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  progressContent:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressText:     { fontSize: 12, fontWeight: '600', width: 60 },
  progressTrack:    { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%' },
  progressPercent:  { fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' },
  scroll:           { flex: 1 },
  content:          { padding: 12, paddingBottom: 32 },
  searchBox:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth },
  searchInput:      { flex: 1, fontSize: 14, padding: 0 },
  categoryScroll:   { marginBottom: 12 },
  categoryContainer:{ flexDirection: 'row', gap: 8, paddingHorizontal: 0 },
  categoryPill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  categoryText:     { fontSize: 12, fontWeight: '500' },
  categorySection:  { marginBottom: 16 },
  categoryTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  guideCard:        { marginBottom: 10, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  guideHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  guideIcon:        { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  titleRow:         { flexDirection: 'row', alignItems: 'center' },
  guideTitle:       { fontSize: 14, fontWeight: '600' },
  metaRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  difficultyBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  difficultyText:   { fontSize: 11, fontWeight: '600' },
  readingTime:      { fontSize: 11 },
  expandedContent:  { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  guideContent:     { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  detailsList:      { gap: 6 },
  detailItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailBullet:     { fontSize: 12, lineHeight: 20, marginTop: 1 },
  detailText:       { fontSize: 12, lineHeight: 18, flex: 1 },
  actionBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  actionBtnText:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  relatedSection:   { marginTop: 8 },
  relatedTitle:     { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  relatedList:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  relatedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  relatedText:      { fontSize: 11, fontWeight: '500' },
  tipsSection:      { marginTop: 16, flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  tipsTitle:        { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tipsText:         { fontSize: 12, lineHeight: 18 },
  emptyState:       { alignItems: 'center', paddingVertical: 60 },
  emptyText:        { fontSize: 14, marginTop: 12 },
});

export default HowToGuideScreen;
