import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import typography from '../../theme/typography';
import { spacing, layout } from '../../theme/spacing';
import { TASK_PRIORITIES } from '../../constants/config';

const TaskCard = ({ task, onPress }) => {
  const { colors } = useTheme();
  const priority = TASK_PRIORITIES[task.priority] || TASK_PRIORITIES[1];
  const isOverdue = task.date_deadline && new Date(task.date_deadline) < new Date();

  const formatDate = dateString => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getStageColor = stageName => {
    const s = stageName?.toLowerCase() || '';
    if (s.includes('done') || s.includes('completed')) return '#4CAF50';
    if (s.includes('progress')) return '#2196F3';
    if (s.includes('review'))   return '#FF9800';
    if (s.includes('cancel'))   return '#F44336';
    return colors.textLight;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress} activeOpacity={0.7}>

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {task.name || 'Untitled Task'}
          </Text>
          {task.project_id && (
            <Text style={[styles.project, { color: colors.textLight }]} numberOfLines={1}>
              {task.project_id[1]}
            </Text>
          )}
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
          <Text style={styles.priorityIcon}>{priority.icon}</Text>
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      {!!task.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.footer}>
        {task.stage_id && (
          <View style={styles.footerItem}>
            <View style={[styles.stageDot, { backgroundColor: getStageColor(task.stage_id[1]) }]} />
            <Text style={[styles.footerText, { color: colors.textLight }]} numberOfLines={1}>
              {task.stage_id[1]}
            </Text>
          </View>
        )}

        {task.date_deadline && (
          <View style={styles.footerItem}>
            <Icon name="calendar-outline" size={14} color={isOverdue ? colors.error : colors.textLight} />
            <Text style={[styles.footerText, { color: isOverdue ? colors.error : colors.textLight },
              isOverdue && { fontWeight: '500' }]}>
              {formatDate(task.date_deadline)}{isOverdue ? ' ⚠️' : ''}
            </Text>
          </View>
        )}

        {task.user_ids?.length > 0 && (
          <View style={styles.footerItem}>
            <Icon name="people-outline" size={14} color={colors.textLight} />
            <Text style={[styles.footerText, { color: colors.textLight }]}>{task.user_ids.length}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container:       { borderRadius: layout.borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  titleContainer:  { flex: 1, marginRight: spacing.sm },
  title:           { fontSize: typography.body1, fontWeight: '600', marginBottom: 2 },
  project:         { fontSize: typography.caption },
  priorityBadge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: layout.borderRadius.round },
  priorityIcon:    { fontSize: 12, marginRight: 4 },
  priorityText:    { fontSize: 10, fontWeight: '600' },
  description:     { fontSize: typography.body2, marginBottom: spacing.sm, lineHeight: 18 },
  footer:          { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  footerItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText:      { fontSize: typography.caption },
  stageDot:        { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
});

export default TaskCard;
