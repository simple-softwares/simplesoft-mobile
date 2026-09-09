import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import { setWorkspace } from '../../store/slices/workspaceSlice';
import ProvisionService from '../../services/provision/provisionService';
import { workspaceWebUrl } from '../../config';

const STEPS = [
  { icon: 'server-outline',           label: 'Preparing your server'       },
  { icon: 'cube-outline',             label: 'Installing modules'           },
  { icon: 'people-outline',           label: 'Setting up team features'     },
  { icon: 'notifications-outline',    label: 'Configuring notifications'    },
  { icon: 'shield-checkmark-outline', label: 'Securing your workspace'      },
  { icon: 'checkmark-circle',         label: 'Almost ready!'                },
];

const WorkspaceLoadingScreen = ({ route, navigation }) => {
  const { jobId, slug, isSyncCreation } = route.params;
  const { colors }      = useTheme();
  const dispatch        = useDispatch();

  const [progress,    setProgress]    = useState(isSyncCreation ? 30 : 0);
  const [statusMsg,   setStatusMsg]   = useState(isSyncCreation ? 'Initializing workspace...' : 'Starting your workspace...');
  const [currentStep, setCurrentStep] = useState(0);
  const [done,        setDone]        = useState(false);
  const [failed,      setFailed]      = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinAnim     = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Auto-navigate to login after workspace is ready
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [done, navigation]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100, duration: 600,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
    setCurrentStep(Math.min(Math.floor((progress / 100) * (STEPS.length - 1)), STEPS.length - 1));
  }, [progress]);

  // Poll status (handles both async job polling and sync workspace verification)
  useEffect(() => {
    let timer;
    let attempts = 0;

    const poll = async () => {
      try {
        if (isSyncCreation) {
          // For sync creation, verify workspace database is ready
          const healthUrl = `${workspaceWebUrl(slug)}/health`;
          const healthRes = await fetch(healthUrl);

          if (healthRes.ok) {
            // Database is ready! Simulate final progress
            setProgress(100);
            setStatusMsg('Workspace ready!');
            setDone(true);

            // ✅ Save to Redux
            dispatch(setWorkspace({
              slug:          slug,
              workspace_url: workspaceWebUrl(slug),
              company:       slug,
              modules:       [],
            }));
            return;
          }

          // Still initializing - increment progress gradually
          setProgress(prev => Math.min(prev + 10, 95));
          setStatusMsg('Setting up your workspace...');

          attempts++;
          if (attempts < 60) timer = setTimeout(poll, 2000); // Poll for 2 minutes max
          else setFailed(true);
        } else {
          // Original async job polling
          const res = await ProvisionService.pollStatus(jobId);
          setProgress(res.progress);
          setStatusMsg(res.message);

          if (res.status === 'ready') {
            setDone(true);
            dispatch(setWorkspace({
              slug:          res.slug,
              workspace_url: res.workspace_url,
              company:       res.company,
              modules:       res.modules || [],
            }));
            return;
          }

          if (res.status === 'failed') {
            setFailed(true);
            return;
          }

          attempts++;
          if (attempts < 90) timer = setTimeout(poll, 2000);
          else setFailed(true);
        }
      } catch (e) {
        attempts++;
        if (attempts < 60) timer = setTimeout(poll, 2000);
        else setFailed(true);
      }
    };

    timer = setTimeout(poll, isSyncCreation ? 500 : 1000);
    return () => clearTimeout(timer);
  }, [jobId, slug, isSyncCreation]);

  const spin  = spinAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });
  const barWidth = progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] });

  if (failed) return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.error + '18' }]}>
        <Icon name="close-circle" size={52} color={colors.error} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Setup failed</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>Something went wrong. Please try again.</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.iconWrap, {
        backgroundColor: done ? colors.success + '18' : colors.primary + '18',
        transform: [{ scale: pulseAnim }],
      }]}>
        {done
          ? <Icon name="checkmark-circle" size={52} color={colors.success} />
          : <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Icon name="layers" size={52} color={colors.primary} />
            </Animated.View>
        }
      </Animated.View>

      <Text style={[styles.title, { color: colors.text }]}>
        {done ? 'Workspace ready! ���' : 'Building your workspace'}
      </Text>
      <Text style={[styles.slug, { color: colors.primary }]}>
        {workspaceWebUrl(slug)}
      </Text>

      <View style={[styles.progressWrap, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressBar, {
          width: barWidth,
          backgroundColor: done ? colors.success : colors.primary,
        }]} />
      </View>

      <Text style={[styles.percent, { color: colors.textSecondary }]}>{progress}%</Text>
      <Text style={[styles.statusMsg, { color: colors.text }]}>{statusMsg}</Text>

      <View style={styles.steps}>
        {STEPS.map((step, i) => {
          const isActive = i === currentStep && !done;
          const isDone   = i < currentStep || done;
          return (
            <View key={i} style={styles.step}>
              <View style={[styles.stepDot, {
                backgroundColor: isDone ? colors.success : isActive ? colors.primary : colors.border,
              }]}>
                {isDone   && <Icon name="checkmark" size={10} color="#fff" />}
                {isActive && <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Icon name="reload" size={10} color="#fff" />
                </Animated.View>}
              </View>
              <Text style={[styles.stepLabel, {
                color:      isDone ? colors.success : isActive ? colors.text : colors.textLight,
                fontWeight: isActive ? '600' : '400',
              }]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const S = StyleSheet;
const styles = S.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap:     { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title:        { fontSize: 22, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  sub:          { fontSize: 15, textAlign: 'center', marginTop: 8 },
  slug:         { fontSize: 14, fontWeight: '600', marginBottom: 32 },
  progressWrap: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBar:  { height: '100%', borderRadius: 3 },
  percent:      { fontSize: 13, marginBottom: 8 },
  statusMsg:    { fontSize: 15, fontWeight: '500', marginBottom: 32, textAlign: 'center' },
  steps:        { width: '100%', gap: 12 },
  step:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot:      { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepLabel:    { fontSize: 13, flex: 1 },
});

export default WorkspaceLoadingScreen;
