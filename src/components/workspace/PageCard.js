import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const getIcon = (type) => {
  switch (type) {
    case 'document': return 'document-text-outline';
    case 'database': return 'grid-outline';
    case 'template': return 'copy-outline';
    default:         return 'document-outline';
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now  = new Date();
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  return date.toLocaleDateString();
};

const PageCard = ({ page, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Icon name={getIcon(page.type)} size={24} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {page.title || 'Untitled'}
        </Text>
        <View style={styles.metadata}>
          {page.emoji && <Text style={styles.emoji}>{page.emoji}</Text>}
          <Text style={[styles.date, { color: colors.textLight }]}>{formatDate(page.updatedAt)}</Text>
          {page.author && (
            <>
              <Text style={[styles.dot, { color: colors.textLight }]}>•</Text>
              <Text style={[styles.author, { color: colors.textLight }]}>{page.author}</Text>
            </>
          )}
        </View>
      </View>

      <Icon name="chevron-forward-outline" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container:     { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  content:       { flex: 1 },
  title:         { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  metadata:      { flexDirection: 'row', alignItems: 'center' },
  emoji:         { fontSize: 12, marginRight: 4 },
  date:          { fontSize: 12 },
  dot:           { fontSize: 12, marginHorizontal: 4 },
  author:        { fontSize: 12 },
});

export default PageCard;
