import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import payrollService, { PAYROLL_STATES, fmtINR, fmtMonth } from '../payrollService';

// ── Payslip breakdown for one employee line ───────────────────────────────────

function Row({ label, value, bold, colors, accent }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: colors.textSecondary }, bold && { fontWeight: '700', color: colors.text }]}>
        {label}
      </Text>
      <Text style={[s.rowValue, { color: accent || colors.text }, bold && { fontWeight: '800', fontSize: 15 }]}>
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }) {
  return <View style={[s.divider, { backgroundColor: colors.border }]} />;
}

function SectionHeader({ title, colors }) {
  return <Text style={[s.sectionHeader, { color: colors.textLight }]}>{title}</Text>;
}

function PayslipView({ line, runId, colors }) {
  const [downloading, setDownloading] = useState(false);

  const openPdf = async () => {
    setDownloading(true);
    try {
      const url = payrollService.payslipUrl(runId, line.id);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open PDF on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to open payslip');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={[s.payslipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Employee header */}
      <View style={[s.empHeader, { borderBottomColor: colors.border }]}>
        <View style={[s.empAvatar, { backgroundColor: colors.primary + '20' }]}>
          <Icon name="person" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.empName, { color: colors.text }]}>{line.employee_name}</Text>
          {!!line.designation && (
            <Text style={[s.empDes, { color: colors.textSecondary }]}>{line.designation}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.daysLabel, { color: colors.textLight }]}>Days Paid</Text>
          <Text style={[s.daysValue, { color: colors.text }]}>
            {line.paid_days}/{line.working_days}
          </Text>
        </View>
      </View>

      <View style={s.breakdown}>
        {/* Earnings */}
        <SectionHeader title="EARNINGS" colors={colors} />
        <Row label="Basic Salary"       value={fmtINR(line.basic_salary)}       colors={colors} />
        <Row label="HRA"                value={fmtINR(line.hra)}                colors={colors} />
        <Row label="Special Allowance"  value={fmtINR(line.special_allowance)}  colors={colors} />
        <Divider colors={colors} />
        <Row label="Gross Salary" value={fmtINR(line.monthly_gross)} bold colors={colors} accent={colors.text} />

        <View style={{ height: 14 }} />

        {/* Deductions */}
        <SectionHeader title="DEDUCTIONS" colors={colors} />
        <Row label="EPF (Employee 12%)" value={fmtINR(line.epf_employee)}      colors={colors} />
        <Row label="Professional Tax"   value={fmtINR(line.professional_tax)}  colors={colors} />
        <Divider colors={colors} />
        <Row label="Total Deductions" value={fmtINR(line.total_deductions)} bold colors={colors} accent="#EF4444" />
      </View>

      {/* Net Pay */}
      <View style={[s.netBox, { backgroundColor: '#10B98112', borderColor: '#10B98140' }]}>
        <Text style={[s.netLabel, { color: '#10B981' }]}>Net Pay</Text>
        <Text style={[s.netAmount, { color: '#10B981' }]}>{fmtINR(line.net_salary)}</Text>
      </View>

      {/* Employer EPF note */}
      {!!line.epf_employer && (
        <View style={[s.epfNote, { backgroundColor: colors.background }]}>
          <Icon name="information-circle-outline" size={13} color={colors.textLight} />
          <Text style={[s.epfNoteText, { color: colors.textLight }]}>
            Employer EPF Contribution: {fmtINR(line.epf_employer)}
          </Text>
        </View>
      )}

      {/* Download button */}
      <TouchableOpacity
        style={[s.downloadBtn, { backgroundColor: colors.primary, opacity: downloading ? 0.7 : 1 }]}
        onPress={openPdf}
        disabled={downloading}>
        {downloading
          ? <ActivityIndicator size="small" color="#fff" />
          : <>
              <Icon name="download-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.downloadText}>Download Payslip PDF</Text>
            </>}
      </TouchableOpacity>
    </View>
  );
}

// ── Admin: compact row per employee ──────────────────────────────────────────

function EmployeeLineRow({ line, runId, colors }) {
  const [downloading, setDownloading] = useState(false);

  const openPdf = async () => {
    setDownloading(true);
    try {
      const url = payrollService.payslipUrl(runId, line.id);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open payslip');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={[s.lineRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.lineName, { color: colors.text }]}>{line.employee_name}</Text>
        <Text style={[s.lineDes, { color: colors.textSecondary }]}>
          {line.designation || 'Employee'}
        </Text>
        <View style={s.lineAmounts}>
          <Text style={[s.lineAmt, { color: colors.textSecondary }]}>
            Gross {fmtINR(line.monthly_gross)}
          </Text>
          <Text style={{ color: colors.textLight, marginHorizontal: 6 }}>·</Text>
          <Text style={[s.lineAmt, { color: '#10B981', fontWeight: '700' }]}>
            Net {fmtINR(line.net_salary)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[s.pdfBtn, { borderColor: colors.border, opacity: downloading ? 0.5 : 1 }]}
        onPress={openPdf}
        disabled={downloading}>
        {downloading
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Icon name="document-text-outline" size={18} color={colors.primary} />}
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PayrollDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const user    = useSelector(s => s.auth?.user);
  const isAdmin = user?.is_admin || user?.role === 'admin';

  const [run,     setRun]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollService.getRun(id)
      .then(data => setRun(data))
      .catch(() => Alert.alert('Error', 'Could not load payroll run'))
      .finally(() => setLoading(false));
  }, [id]);

  // Find the current user's own payslip line
  const myLine = run?.lines?.find(l => {
    const uname = (user?.name || '').trim().toLowerCase();
    return l.employee_name?.trim().toLowerCase() === uname;
  });

  const cfg = run ? (PAYROLL_STATES[run.state] || PAYROLL_STATES.draft) : PAYROLL_STATES.draft;

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Payroll run not found.</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.topTitle, { color: colors.text }]}>{fmtMonth(run.month)}</Text>
          <Text style={[s.topSub, { color: colors.textLight }]}>
            {isAdmin ? 'Payroll Run' : 'Payslip'}
          </Text>
        </View>
        <View style={[s.stateBadge, { backgroundColor: cfg.bg }]}>
          <Icon name={cfg.icon} size={11} color={cfg.color} style={{ marginRight: 3 }} />
          <Text style={[s.stateBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Run summary strip */}
        <View style={[s.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.summaryItem}>
            <Text style={[s.sumLabel, { color: colors.textLight }]}>Total Gross</Text>
            <Text style={[s.sumValue, { color: colors.text }]}>{fmtINR(run.total_gross)}</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.sumLabel, { color: colors.textLight }]}>Total Net</Text>
            <Text style={[s.sumValue, { color: '#10B981' }]}>{fmtINR(run.total_net)}</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Text style={[s.sumLabel, { color: colors.textLight }]}>Employees</Text>
            <Text style={[s.sumValue, { color: colors.text }]}>{run.lines?.length ?? '—'}</Text>
          </View>
        </View>

        {/* Employee view: own payslip breakdown */}
        {!isAdmin && (
          myLine
            ? <PayslipView line={myLine} runId={id} colors={colors} />
            : (
              <View style={[s.noPayslip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="alert-circle-outline" size={32} color={colors.textLight} />
                <Text style={[s.noPayslipText, { color: colors.textSecondary }]}>
                  No payslip found for you in this run.
                </Text>
                <Text style={[s.noPayslipSub, { color: colors.textLight }]}>
                  Contact your administrator if this looks incorrect.
                </Text>
              </View>
            )
        )}

        {/* Admin view: all employee lines */}
        {isAdmin && (
          <View style={[s.linesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.linesTitle, { color: colors.textSecondary }]}>
              {run.lines?.length || 0} Employee{run.lines?.length !== 1 ? 's' : ''}
            </Text>
            {(run.lines || []).map(line => (
              <EmployeeLineRow key={line.id} line={line} runId={id} colors={colors} />
            ))}
            {(!run.lines || run.lines.length === 0) && (
              <Text style={[s.noPayslipSub, { color: colors.textLight, textAlign: 'center', paddingVertical: 20 }]}>
                No employee lines in this run.
              </Text>
            )}
          </View>
        )}

        {/* Admin own payslip if they have one too */}
        {isAdmin && myLine && (
          <View>
            <Text style={[s.ownPayslipLabel, { color: colors.textLight }]}>YOUR PAYSLIP</Text>
            <PayslipView line={myLine} runId={id} colors={colors} />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  topBar:      { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                 paddingHorizontal: 14, borderBottomWidth: 0.5, gap: 10 },
  backBtn:     { padding: 4 },
  topTitle:    { fontSize: 16, fontWeight: '700' },
  topSub:      { fontSize: 11, marginTop: 1 },
  stateBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
                 paddingVertical: 3, borderRadius: 10 },
  stateBadgeText: { fontSize: 11, fontWeight: '700' },

  scroll:      { padding: 14, gap: 14 },

  summaryStrip: { flexDirection: 'row', borderRadius: 14, borderWidth: 1,
                  paddingVertical: 14, overflow: 'hidden' },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1 },
  sumLabel:    { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  sumValue:    { fontSize: 15, fontWeight: '800' },

  // Payslip card
  payslipCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  empHeader:   { flexDirection: 'row', alignItems: 'center', padding: 16,
                 borderBottomWidth: 0.5, gap: 12 },
  empAvatar:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empName:     { fontSize: 15, fontWeight: '700' },
  empDes:      { fontSize: 12, marginTop: 1 },
  daysLabel:   { fontSize: 10, fontWeight: '600' },
  daysValue:   { fontSize: 13, fontWeight: '700', textAlign: 'right' },

  breakdown:   { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel:    { fontSize: 13 },
  rowValue:    { fontSize: 13, fontWeight: '600' },
  divider:     { height: 1, marginVertical: 6 },

  netBox:      { margin: 16, borderRadius: 12, borderWidth: 1, padding: 16,
                 flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netLabel:    { fontSize: 15, fontWeight: '700' },
  netAmount:   { fontSize: 22, fontWeight: '900' },

  epfNote:     { flexDirection: 'row', alignItems: 'center', gap: 5,
                 marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 10,
                 paddingVertical: 7, borderRadius: 8 },
  epfNoteText: { fontSize: 11 },

  downloadBtn: { margin: 16, marginTop: 4, paddingVertical: 13, borderRadius: 12,
                 flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  downloadText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Admin lines
  linesCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden', paddingTop: 4 },
  linesTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
                 paddingHorizontal: 16, paddingVertical: 10 },
  lineRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                 paddingVertical: 12, borderBottomWidth: 0.5 },
  lineName:    { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  lineDes:     { fontSize: 11, marginBottom: 4 },
  lineAmounts: { flexDirection: 'row', alignItems: 'center' },
  lineAmt:     { fontSize: 12 },
  pdfBtn:      { width: 38, height: 38, borderRadius: 10, borderWidth: 1,
                 alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

  ownPayslipLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginLeft: 2 },

  noPayslip:   { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8 },
  noPayslipText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  noPayslipSub:  { fontSize: 12, textAlign: 'center' },
});
