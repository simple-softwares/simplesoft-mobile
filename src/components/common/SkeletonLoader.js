import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// ── Shared pulse hook ─────────────────────────────────────────
const usePulse = () => {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
};

// ── Primitive box ─────────────────────────────────────────────
const Box = ({ anim, width, height, radius, style }) => {
  const { colors } = useTheme();
  return (
    <Animated.View style={[
      { width, height, borderRadius: radius ?? 6, backgroundColor: colors.border },
      { opacity: anim },
      style,
    ]} />
  );
};

// ── Row skeleton (task / contact / team member) ───────────────
const SkeletonRow = ({ anim, colors }) => (
  <View style={s.row}>
    <Animated.View style={[s.avatar, { backgroundColor: colors.border, opacity: anim }]} />
    <View style={s.rowLines}>
      <Animated.View style={[s.line, s.lineFull,  { backgroundColor: colors.border, opacity: anim }]} />
      <Animated.View style={[s.line, s.lineShort, { backgroundColor: colors.border, opacity: anim }]} />
    </View>
    <Animated.View style={[s.badge, { backgroundColor: colors.border, opacity: anim }]} />
  </View>
);

// ── Stat tile skeleton (dashboard 2×2 grid) ───────────────────
const SkeletonStatTile = ({ anim, colors }) => (
  <View style={[s.statTile, { backgroundColor: colors.surface }]}>
    <Animated.View style={[s.statIcon,  { backgroundColor: colors.border, opacity: anim }]} />
    <Animated.View style={[s.statValue, { backgroundColor: colors.border, opacity: anim }]} />
    <Animated.View style={[s.statLabel, { backgroundColor: colors.border, opacity: anim }]} />
  </View>
);

// ── Section heading skeleton ──────────────────────────────────
const SkeletonSection = ({ anim, colors }) => (
  <Animated.View style={[s.sectionLine, { backgroundColor: colors.border, opacity: anim }]} />
);

// ── Public: list of row skeletons (Tasks / Contacts / Team) ──
export const SkeletonList = ({ count = 6 }) => {
  const { colors } = useTheme();
  const anim = usePulse();
  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.listCard, { backgroundColor: colors.surface }]}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonRow key={i} anim={anim} colors={colors} />
        ))}
      </View>
    </View>
  );
};

// ── Public: dashboard skeleton ────────────────────────────────
export const SkeletonDashboard = () => {
  const { colors } = useTheme();
  const anim = usePulse();
  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {/* Header greeting lines */}
      <View style={s.dashHeader}>
        <Animated.View style={[s.line, { width: 100, backgroundColor: colors.border, opacity: anim }]} />
        <Animated.View style={[s.line, { width: 160, height: 22, marginTop: 6, backgroundColor: colors.border, opacity: anim }]} />
      </View>

      {/* Stat tiles 2×2 */}
      <View style={s.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatTile key={i} anim={anim} colors={colors} />
        ))}
      </View>

      {/* Tasks section */}
      <View style={[s.listCard, { backgroundColor: colors.surface }]}>
        <SkeletonSection anim={anim} colors={colors} />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} anim={anim} colors={colors} />
        ))}
      </View>

      {/* Projects section */}
      <View style={[s.listCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
        <SkeletonSection anim={anim} colors={colors} />
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonRow key={i} anim={anim} colors={colors} />
        ))}
      </View>
    </View>
  );
};

// ── Public: note card grid skeleton (NotesScreen) ─────────────
export const SkeletonNoteGrid = ({ count = 6 }) => {
  const { colors } = useTheme();
  const anim = usePulse();
  const cards = Array.from({ length: count });
  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={s.noteGrid}>
        {cards.map((_, i) => (
          <Animated.View key={i} style={[s.noteCard, { backgroundColor: colors.surface, opacity: anim }]}>
            <Animated.View style={[s.line, s.lineFull,  { backgroundColor: colors.border, marginBottom: 6 }]} />
            <Animated.View style={[s.line, s.lineFull,  { backgroundColor: colors.border, marginBottom: 4 }]} />
            <Animated.View style={[s.line, { width: '60%', height: 10, backgroundColor: colors.border }]} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  screen:   { flex: 1, padding: 16 },

  // Row
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  avatar:   { width: 40, height: 40, borderRadius: 20 },
  rowLines: { flex: 1, gap: 8 },
  line:     { height: 12, borderRadius: 6 },
  lineFull: { width: '90%' },
  lineShort:{ width: '55%' },
  badge:    { width: 48, height: 20, borderRadius: 10 },

  // Stat tiles
  statsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statTile: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 14, gap: 8, alignItems: 'flex-start' },
  statIcon: { width: 28, height: 28, borderRadius: 8 },
  statValue:{ width: 40, height: 22, borderRadius: 6 },
  statLabel:{ width: 60, height: 10, borderRadius: 5 },

  // Section heading
  sectionLine: { height: 14, width: '40%', borderRadius: 7, margin: 14, marginBottom: 4 },

  // List card (wraps rows)
  listCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },

  // Dashboard header
  dashHeader: { paddingHorizontal: 4, marginBottom: 16 },

  // Note grid
  noteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  noteCard: { width: '47%', borderRadius: 12, padding: 14, minHeight: 100 },
});
