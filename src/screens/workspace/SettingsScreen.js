import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import { useSelector, useDispatch } from 'react-redux';
import { setThemeMode } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { setCloudAi } from '../../store/slices/workspaceSlice';
import { setLanguage } from '../../store/slices/languageSlice';
import { getLanguageOptions } from '../../i18n/config';
import httpClient from '../../services/api/httpClient';
import { notifStorage } from '../../services/storage/storageRegistry';
import ExportDataModal from '../../components/export/ExportDataModal';
import AIFeaturesShowcase from '../../components/AIFeaturesShowcase';
import { workspaceWebUrl } from '../../config';

// ── Constants ──────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { key: 'openai',    label: 'OpenAI',    hint: 'GPT-4o, GPT-4o-mini',       icon: 'logo-electron'    },
  { key: 'anthropic', label: 'Anthropic', hint: 'Claude 3.5 Sonnet / Haiku', icon: 'sparkles-outline' },
  { key: 'gemini',    label: 'Gemini',    hint: 'Gemini 1.5 Pro / Flash',    icon: 'diamond-outline'  },
];

const DEFAULT_MODELS = {
  openai:    'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  gemini:    'gemini-1.5-flash',
};

const EMAIL_PRESETS = [
  { key: 'gmail',   label: 'Gmail',   host: 'smtp.gmail.com',          port: 587, tls: true  },
  { key: 'outlook', label: 'Outlook', host: 'smtp-mail.outlook.com',   port: 587, tls: true  },
  { key: 'yahoo',   label: 'Yahoo',   host: 'smtp.mail.yahoo.com',     port: 587, tls: true  },
  { key: 'custom',  label: 'Custom',  host: '',                        port: 587, tls: false },
];

const MODULE_SETTINGS_CONFIG = {
  quotations: {
    title: 'Quotations',
    icon: 'document-outline',
    fields: [
      { key: 'prefix',          label: 'Quote Prefix',           type: 'text',   placeholder: 'QT-'  },
      { key: 'validity_days',   label: 'Default Validity (days)',type: 'number', placeholder: '30'   },
      { key: 'show_hsn',        label: 'Show HSN Codes',         type: 'toggle'                      },
      { key: 'default_terms',   label: 'Default Terms',          type: 'text',   multiline: true, placeholder: 'Payment terms...' },
      { key: 'default_notes',   label: 'Default Notes',          type: 'text',   multiline: true, placeholder: 'Thank you...' },
    ],
  },
  invoices: {
    title: 'Invoices',
    icon: 'receipt-outline',
    fields: [
      { key: 'prefix',               label: 'Invoice Prefix',         type: 'text',   placeholder: 'INV-'  },
      { key: 'payment_terms',        label: 'Default Payment Terms',  type: 'text',   placeholder: 'Net 30' },
      { key: 'default_notes',        label: 'Default Notes',          type: 'text',   multiline: true, placeholder: 'Thank you for your business.' },
      { key: 'late_payment_notice',  label: 'Late Payment Notice',    type: 'text',   multiline: true, placeholder: 'A late payment fee of 2% applies...' },
    ],
  },
  crm: {
    title: 'CRM',
    icon: 'trending-up-outline',
    fields: [
      { key: 'default_probability', label: 'Default Win Probability (%)', type: 'number', placeholder: '50' },
      { key: 'win_reasons',         label: 'Win Reasons (comma-separated)', type: 'text', multiline: true, placeholder: 'Price, Quality, Support' },
      { key: 'lost_reasons',        label: 'Lost Reasons (comma-separated)', type: 'text', multiline: true, placeholder: 'Price too high, No budget' },
    ],
  },
  sales: {
    title: 'Sales Orders',
    icon: 'bag-outline',
    fields: [
      { key: 'prefix',         label: 'Order Prefix',          type: 'text',   placeholder: 'SO-'   },
      { key: 'payment_terms',  label: 'Default Payment Terms', type: 'text',   placeholder: 'Net 30' },
      { key: 'auto_confirm',   label: 'Auto-Confirm Orders',   type: 'toggle'                        },
      { key: 'default_notes',  label: 'Default Notes',         type: 'text',   multiline: true, placeholder: 'Thank you...' },
    ],
  },
  hr: {
    title: 'HR & Payroll',
    icon: 'people-outline',
    fields: [
      { key: 'working_days_per_month', label: 'Working Days / Month',   type: 'number', placeholder: '26'  },
      { key: 'epf_employee_rate',      label: 'EPF Employee Rate (%)',  type: 'number', placeholder: '12'  },
      { key: 'epf_employer_rate',      label: 'EPF Employer Rate (%)',  type: 'number', placeholder: '12'  },
      { key: 'pt_state',               label: 'Professional Tax State', type: 'text',   placeholder: 'MH'  },
      { key: 'pay_period',             label: 'Pay Period',             type: 'select',
        options: [{ value: 'monthly', label: 'Monthly' }, { value: 'biweekly', label: 'Bi-Weekly' }] },
    ],
  },
  attendance: {
    title: 'Attendance',
    icon: 'time-outline',
    fields: [
      { key: 'default_start_time',     label: 'Default Start Time',   type: 'text',   placeholder: '09:00' },
      { key: 'default_end_time',       label: 'Default End Time',     type: 'text',   placeholder: '18:00' },
      { key: 'grace_period_minutes',   label: 'Grace Period (minutes)',type: 'number', placeholder: '15'   },
      { key: 'weekly_off',             label: 'Weekly Off Days (comma-sep)', type: 'text', placeholder: 'Saturday,Sunday' },
    ],
  },
  inventory: {
    title: 'Inventory',
    icon: 'cube-outline',
    fields: [
      { key: 'low_stock_alert', label: 'Low Stock Alert Threshold', type: 'number', placeholder: '10'  },
      { key: 'auto_reorder',    label: 'Auto Reorder',              type: 'toggle'                     },
      { key: 'default_uom',     label: 'Default Unit of Measure',   type: 'text',   placeholder: 'pcs' },
    ],
  },
  expenses: {
    title: 'Expenses',
    icon: 'card-outline',
    fields: [
      { key: 'approval_threshold',    label: 'Approval Threshold (₹)',  type: 'number', placeholder: '5000' },
      { key: 'reimbursement_sla_days',label: 'Reimbursement SLA (days)',type: 'number', placeholder: '7'    },
      { key: 'require_receipt',       label: 'Require Receipt',         type: 'toggle'                      },
    ],
  },
  projects: {
    title: 'Projects',
    icon: 'folder-outline',
    fields: [
      { key: 'default_view',     label: 'Default View',           type: 'select',
        options: [{ value: 'kanban', label: 'Kanban' }, { value: 'list', label: 'List' }, { value: 'gantt', label: 'Gantt' }] },
      { key: 'notify_on_assign', label: 'Notify on Assignment',   type: 'toggle' },
      { key: 'allow_overdue',    label: 'Allow Overdue Tasks',    type: 'toggle' },
    ],
  },
  contacts: {
    title: 'Contacts',
    icon: 'people-outline',
    fields: [
      { key: 'default_type',    label: 'Default Contact Type', type: 'select',
        options: [{ value: 'customer', label: 'Customer' }, { value: 'vendor', label: 'Vendor' }, { value: 'both', label: 'Both' }] },
      { key: 'require_gstin',   label: 'Require GSTIN',         type: 'toggle' },
      { key: 'allow_duplicates',label: 'Allow Duplicate Contacts',type: 'toggle' },
    ],
  },
};

const MODULE_ORDER = ['quotations', 'invoices', 'crm', 'sales', 'hr', 'attendance', 'inventory', 'expenses', 'projects', 'contacts'];

// ── Shared helpers ─────────────────────────────────────────────────────────────

const FieldLabel = ({ label, colors }) => (
  <Text style={[s.fieldLabel, { color: colors.textLight }]}>{label.toUpperCase()}</Text>
);

const TextRow = ({ label, value, onChangeText, placeholder, colors, multiline, keyboardType, secureTextEntry }) => (
  <View style={{ marginBottom: 14 }}>
    <FieldLabel label={label} colors={colors} />
    <TextInput
      style={[s.fieldInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
              multiline && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textLight}
      multiline={!!multiline}
      keyboardType={keyboardType || 'default'}
      secureTextEntry={!!secureTextEntry}
      autoCapitalize="none"
    />
  </View>
);

const ToggleRow = ({ label, value, onValueChange, colors }) => (
  <View style={[s.toggleRow, { borderBottomColor: colors.border }]}>
    <Text style={[s.toggleLabel, { color: colors.text }]}>{label}</Text>
    <Switch
      value={!!value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary + '50' }}
      thumbColor={value ? colors.primary : colors.textSecondary}
    />
  </View>
);

const SelectRow = ({ label, value, options, onChange, colors }) => {
  const current = options.find(o => o.value === value) || options[0];
  return (
    <View style={{ marginBottom: 14 }}>
      <FieldLabel label={label} colors={colors} />
      <View style={s.selectRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[s.selectOption, { borderColor: value === opt.value ? colors.primary : colors.border,
              backgroundColor: value === opt.value ? colors.primary + '10' : colors.background }]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}>
            <Text style={[s.selectOptionText, { color: value === opt.value ? colors.primary : colors.text }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ModalShell = ({ visible, onClose, title, icon, iconColor, children, footer, colors }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <View style={s.modalTitleRow}>
            <View style={[s.modalIconBox, { backgroundColor: (iconColor || colors.primary) + '20' }]}>
              <Icon name={icon} size={18} color={iconColor || colors.primary} />
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer && (
          <View style={[s.modalFooter, { borderTopColor: colors.border }]}>
            {footer}
          </View>
        )}
      </View>
    </View>
  </Modal>
);

const SaveCancelFooter = ({ onCancel, onSave, saving, colors }) => (
  <>
    <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.background }]} onPress={onCancel} disabled={saving}>
      <Text style={[s.modalBtnText, { color: colors.text }]}>Cancel</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
      {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalBtnTextPrimary}>Save</Text>}
    </TouchableOpacity>
  </>
);

// ── Language modal ─────────────────────────────────────────────────────────────

const LanguageModal = ({ visible, onClose, colors, dispatch, currentLanguage }) => {
  const languages = getLanguageOptions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={s.modalTitleRow}>
              <View style={[s.modalIconBox, { backgroundColor: '#2196F320' }]}>
                <Icon name="language-outline" size={18} color="#2196F3" />
              </View>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Language</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[s.langRow, { borderColor: currentLanguage === lang.code ? '#2196F3' : colors.border,
                  backgroundColor: currentLanguage === lang.code ? '#2196F308' : colors.background }]}
                onPress={() => { dispatch(setLanguage(lang.code)); onClose(); }}
                activeOpacity={0.7}>
                <Text style={s.langFlag}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.langLabel, { color: colors.text }]}>{lang.name}</Text>
                  <Text style={[s.langNative, { color: colors.textSecondary }]}>{lang.nativeName}</Text>
                </View>
                {currentLanguage === lang.code && <Icon name="checkmark-circle" size={20} color="#2196F3" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Cloud AI modal ─────────────────────────────────────────────────────────────

const CloudAIModal = ({ visible, onClose, colors, dispatch }) => {
  const cloudAi = useSelector(s => s.workspace.cloudAi);
  const [enabled,  setEnabled]  = useState(cloudAi.enabled);
  const [provider, setProvider] = useState(cloudAi.provider || 'openai');
  const [model,    setModel]    = useState(cloudAi.model || DEFAULT_MODELS.openai);
  const [apiKey,   setApiKey]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);

  const handleProviderChange = (p) => {
    setProvider(p);
    if (!model || model === DEFAULT_MODELS[provider]) setModel(DEFAULT_MODELS[p]);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) { Alert.alert('Required', 'Enter an API key to test'); return; }
    setTesting(true);
    try {
      await httpClient.post('/workspace/ai-config', { provider, model, api_key: apiKey });
      const res = await httpClient.post('/workspace/ai-test', { question: 'Reply with just "OK".' });
      if (res.data?.status === 'success') {
        Alert.alert('Connection successful', `${provider} responded: "${res.data.answer}"`);
      } else {
        Alert.alert('Test failed', res.data?.message || 'Unknown error');
      }
    } catch (e) { Alert.alert('Test failed', friendlyError(e)); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { enabled, provider, model };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      await httpClient.post('/workspace/ai-config', payload);
      dispatch(setCloudAi({ enabled, provider: enabled ? provider : null, model: enabled ? model : null, isAdmin: true, hasKey: cloudAi.hasKey || !!apiKey.trim() }));
      Alert.alert('Saved', 'Cloud AI configuration updated');
      onClose();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Cloud AI" icon="sparkles" iconColor="#7C3AED" colors={colors}
      footer={<SaveCancelFooter onCancel={onClose} onSave={handleSave} saving={saving} colors={colors} />}>
      <View style={[s.toggleRow, { borderBottomColor: colors.border, marginBottom: 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.toggleLabel, { color: colors.text }]}>Enable Cloud AI</Text>
          <Text style={[s.fieldHint, { color: colors.textSecondary }]}>Makes Cloud AI visible to all workspace users</Text>
        </View>
        <Switch value={enabled} onValueChange={setEnabled}
          trackColor={{ false: colors.border, true: '#7C3AED50' }} thumbColor={enabled ? '#7C3AED' : colors.textSecondary} />
      </View>

      <FieldLabel label="Provider" colors={colors} />
      {PROVIDERS.map(p => (
        <TouchableOpacity key={p.key}
          style={[s.providerRow, { borderColor: provider === p.key ? '#7C3AED' : colors.border,
            backgroundColor: provider === p.key ? '#7C3AED08' : colors.background }]}
          onPress={() => handleProviderChange(p.key)} activeOpacity={0.7}>
          <View style={[s.providerIcon, { backgroundColor: provider === p.key ? '#7C3AED20' : colors.background }]}>
            <Icon name={p.icon} size={18} color={provider === p.key ? '#7C3AED' : colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.providerLabel, { color: colors.text }]}>{p.label}</Text>
            <Text style={[s.providerHint,  { color: colors.textSecondary }]}>{p.hint}</Text>
          </View>
          {provider === p.key && <Icon name="checkmark-circle" size={20} color="#7C3AED" />}
        </TouchableOpacity>
      ))}

      <TextRow label="Model" value={model} onChangeText={setModel} placeholder={DEFAULT_MODELS[provider] || 'model name'} colors={colors} />
      <TextRow label={`API Key${cloudAi.hasKey ? ' (key saved — enter to replace)' : ''}`}
        value={apiKey} onChangeText={setApiKey}
        placeholder={cloudAi.hasKey ? '••••••••••••••••' : 'sk-... or API key'} colors={colors} secureTextEntry />
      <Text style={[s.keyNote, { color: colors.textLight }]}>Key is stored securely on the server. Employees never see it.</Text>
      <TouchableOpacity style={[s.testBtn, { backgroundColor: colors.background }, testing && { opacity: 0.6 }]}
        onPress={handleTest} disabled={testing || saving} activeOpacity={0.7}>
        {testing ? <ActivityIndicator size="small" color="#7C3AED" /> :
          <><Icon name="wifi-outline" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
            <Text style={[s.testBtnText, { color: '#7C3AED' }]}>Test Connection</Text></>}
      </TouchableOpacity>
    </ModalShell>
  );
};

// ── Company Settings modal ─────────────────────────────────────────────────────

const CompanySettingsModal = ({ visible, onClose, colors }) => {
  const [form, setForm] = useState({ legal_name: '', gstin: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    httpClient.get('/gst/config').then(res => {
      const d = res.data || {};
      setForm({
        legal_name: d.legal_name || '',
        gstin:      d.gstin      || '',
        address:    d.address    || '',
        city:       d.city       || '',
        state:      d.state      || '',
        pincode:    d.pincode    || '',
        phone:      d.phone      || '',
        email:      d.email      || '',
        website:    d.website    || '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [visible]);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await httpClient.post('/gst/config', form);
      Alert.alert('Saved', 'Company settings updated');
      onClose();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Company Settings" icon="business-outline" colors={colors}
      footer={<SaveCancelFooter onCancel={onClose} onSave={handleSave} saving={saving} colors={colors} />}>
      {loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : <>
        <TextRow label="Legal Name"   value={form.legal_name} onChangeText={set('legal_name')} placeholder="Acme Pvt Ltd"       colors={colors} />
        <TextRow label="GSTIN"        value={form.gstin}      onChangeText={set('gstin')}      placeholder="27AABCU9603R1ZX"   colors={colors} />
        <TextRow label="Address"      value={form.address}    onChangeText={set('address')}    placeholder="123 Main Street"   colors={colors} multiline />
        <TextRow label="City"         value={form.city}       onChangeText={set('city')}       placeholder="Mumbai"            colors={colors} />
        <TextRow label="State"        value={form.state}      onChangeText={set('state')}      placeholder="Maharashtra"       colors={colors} />
        <TextRow label="Pincode"      value={form.pincode}    onChangeText={set('pincode')}    placeholder="400001"            colors={colors} keyboardType="number-pad" />
        <TextRow label="Phone"        value={form.phone}      onChangeText={set('phone')}      placeholder="+91 98765 43210"   colors={colors} keyboardType="phone-pad" />
        <TextRow label="Email"        value={form.email}      onChangeText={set('email')}      placeholder="accounts@acme.com" colors={colors} keyboardType="email-address" />
        <TextRow label="Website"      value={form.website}    onChangeText={set('website')}    placeholder="https://acme.com"  colors={colors} />
      </>}
    </ModalShell>
  );
};

// ── Workspace modal ────────────────────────────────────────────────────────────

const WorkspaceModal = ({ visible, onClose, colors }) => {
  const [name, setName]   = useState('');
  const [slug, setSlug]   = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    httpClient.get('/workspace/info').then(res => {
      setName(res.data?.name || '');
      setSlug(res.data?.slug || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, [visible]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Workspace name cannot be empty'); return; }
    setSaving(true);
    try {
      await httpClient.patch('/workspace/info', { name });
      Alert.alert('Saved', 'Workspace name updated');
      onClose();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Workspace" icon="globe-outline" colors={colors}
      footer={<SaveCancelFooter onCancel={onClose} onSave={handleSave} saving={saving} colors={colors} />}>
      {loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : <>
        <TextRow label="Workspace Name" value={name} onChangeText={setName} placeholder="My Company" colors={colors} />
        <View style={{ marginBottom: 14 }}>
          <FieldLabel label="Workspace ID / URL" colors={colors} />
          <View style={[s.fieldInput, s.readOnly, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[{ color: colors.textSecondary, fontSize: 14 }]}>{workspaceWebUrl(slug)}</Text>
          </View>
          <Text style={[s.keyNote, { color: colors.textLight, marginTop: 4 }]}>
            The workspace ID cannot be changed after creation. Employee emails are generated as firstname@{slug || 'slug'}.in
          </Text>
        </View>
      </>}
    </ModalShell>
  );
};

// ── Email / SMTP modal ─────────────────────────────────────────────────────────

const EmailModal = ({ visible, onClose, colors }) => {
  const [preset,    setPreset]    = useState('gmail');
  const [host,      setHost]      = useState('smtp.gmail.com');
  const [port,      setPort]      = useState('587');
  const [tls,       setTls]       = useState(true);
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName,  setFromName]  = useState('');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    httpClient.get('/settings/email').then(res => {
      const d = res.data || {};
      setHost(d.smtp_host || 'smtp.gmail.com');
      setPort(String(d.smtp_port || 587));
      setTls(d.smtp_tls !== false);
      setUsername(d.smtp_username || '');
      setFromEmail(d.from_email || '');
      setFromName(d.from_name || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, [visible]);

  const applyPreset = (p) => {
    setPreset(p.key);
    if (p.host) setHost(p.host);
    setPort(String(p.port));
    setTls(p.tls);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await httpClient.post('/settings/email/test', { to: fromEmail || username });
      Alert.alert('Test sent', 'Check your inbox for the test email');
    } catch (e) { Alert.alert('Test failed', friendlyError(e)); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        smtp_host:     host,
        smtp_port:     parseInt(port, 10) || 587,
        smtp_tls:      tls,
        smtp_username: username,
        from_email:    fromEmail,
        from_name:     fromName,
      };
      if (password.trim()) payload.smtp_password = password.trim();
      await httpClient.put('/settings/email', payload);
      Alert.alert('Saved', 'Email configuration updated');
      onClose();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Email / SMTP" icon="mail-outline" iconColor="#4CAF50" colors={colors}
      footer={
        <>
          <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.background }, testing && { opacity: 0.6 }]}
            onPress={handleTest} disabled={testing || saving} activeOpacity={0.7}>
            {testing ? <ActivityIndicator size="small" color="#4CAF50" /> :
              <Text style={[s.modalBtnText, { color: '#4CAF50' }]}>Send Test</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave} disabled={saving || testing} activeOpacity={0.7}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalBtnTextPrimary}>Save</Text>}
          </TouchableOpacity>
        </>
      }>
      {loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : <>
        <FieldLabel label="Provider" colors={colors} />
        <View style={s.presetRow}>
          {EMAIL_PRESETS.map(p => (
            <TouchableOpacity key={p.key}
              style={[s.presetChip, { borderColor: preset === p.key ? colors.primary : colors.border,
                backgroundColor: preset === p.key ? colors.primary + '10' : colors.background }]}
              onPress={() => applyPreset(p)} activeOpacity={0.7}>
              <Text style={[s.presetChipText, { color: preset === p.key ? colors.primary : colors.text }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextRow label="SMTP Host"   value={host}      onChangeText={setHost}      placeholder="smtp.gmail.com" colors={colors} />
        <TextRow label="SMTP Port"   value={port}      onChangeText={setPort}      placeholder="587"            colors={colors} keyboardType="number-pad" />
        <ToggleRow label="Use TLS"   value={tls}       onValueChange={setTls}      colors={colors} />
        <TextRow label="Username"    value={username}  onChangeText={setUsername}  placeholder="you@gmail.com"  colors={colors} keyboardType="email-address" />
        <TextRow label="Password / App Password" value={password} onChangeText={setPassword}
          placeholder="Leave blank to keep existing" colors={colors} secureTextEntry />
        <TextRow label="From Email"  value={fromEmail} onChangeText={setFromEmail} placeholder="noreply@company.com" colors={colors} keyboardType="email-address" />
        <TextRow label="From Name"   value={fromName}  onChangeText={setFromName}  placeholder="My Company"         colors={colors} />
      </>}
    </ModalShell>
  );
};

// ── WhatsApp modal ─────────────────────────────────────────────────────────────

const WhatsAppModal = ({ visible, onClose, colors }) => {
  const [serviceUrl, setServiceUrl] = useState('');
  const [apiKey,     setApiKey]     = useState('');
  const [notifOn,    setNotifOn]    = useState(true);
  const [status,     setStatus]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      httpClient.get('/settings/whatsapp').catch(() => ({ data: {} })),
      httpClient.get('/settings/whatsapp/status').catch(() => ({ data: {} })),
    ]).then(([cfgRes, stsRes]) => {
      const d = cfgRes.data || {};
      setServiceUrl(d.service_url || '');
      setNotifOn(d.notifications_enabled !== false);
      setStatus(stsRes.data || null);
    }).finally(() => setLoading(false));
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { service_url: serviceUrl, notifications_enabled: notifOn };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      await httpClient.put('/settings/whatsapp', payload);
      Alert.alert('Saved', 'WhatsApp configuration updated');
      onClose();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  const sessionConnected = status?.connected === true;

  return (
    <ModalShell visible={visible} onClose={onClose} title="WhatsApp" icon="logo-whatsapp" iconColor="#25D366" colors={colors}
      footer={<SaveCancelFooter onCancel={onClose} onSave={handleSave} saving={saving} colors={colors} />}>
      {loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : <>
        {status && (
          <View style={[s.statusBanner, { backgroundColor: sessionConnected ? '#25D36615' : colors.background, borderColor: sessionConnected ? '#25D366' : colors.border }]}>
            <Icon name={sessionConnected ? 'checkmark-circle' : 'warning-outline'} size={16} color={sessionConnected ? '#25D366' : colors.textSecondary} />
            <Text style={[s.statusText, { color: sessionConnected ? '#25D366' : colors.textSecondary }]}>
              {sessionConnected ? 'Session connected' : 'Session not connected'}
            </Text>
          </View>
        )}
        <TextRow label="Service URL" value={serviceUrl} onChangeText={setServiceUrl} placeholder="https://waha.yourserver.com" colors={colors} />
        <TextRow label="API Key" value={apiKey} onChangeText={setApiKey} placeholder="Leave blank to keep existing" colors={colors} secureTextEntry />
        <ToggleRow label="Enable WhatsApp Notifications" value={notifOn} onValueChange={setNotifOn} colors={colors} />
      </>}
    </ModalShell>
  );
};

// ── Module Settings modal ──────────────────────────────────────────────────────

const ModuleSettingsModal = ({ visible, onClose, moduleKey, colors }) => {
  const config = MODULE_SETTINGS_CONFIG[moduleKey];
  const [form,    setForm]    = useState({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!visible || !moduleKey) return;
    setLoading(true);
    httpClient.get(`/workspace/module-settings/${moduleKey}`).then(res => {
      const d = res.data || {};
      const initial = {};
      (config?.fields || []).forEach(f => {
        if (f.type === 'toggle') {
          initial[f.key] = d[f.key] !== undefined ? !!d[f.key] : false;
        } else {
          initial[f.key] = d[f.key] !== undefined ? String(d[f.key]) : '';
        }
      });
      setForm(initial);
    }).catch(() => {
      const initial = {};
      (config?.fields || []).forEach(f => { initial[f.key] = f.type === 'toggle' ? false : ''; });
      setForm(initial);
    }).finally(() => setLoading(false));
  }, [visible, moduleKey]);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      (config?.fields || []).forEach(f => {
        if (f.type === 'toggle') {
          payload[f.key] = !!form[f.key];
        } else if (f.type === 'number') {
          payload[f.key] = form[f.key] ? parseFloat(form[f.key]) : null;
        } else {
          payload[f.key] = form[f.key] || null;
        }
      });
      await httpClient.patch(`/workspace/module-settings/${moduleKey}`, payload);
      Alert.alert('Saved', `${config?.title || moduleKey} settings updated`);
      onClose();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  if (!config) return null;

  return (
    <ModalShell visible={visible} onClose={onClose} title={config.title} icon={config.icon} colors={colors}
      footer={<SaveCancelFooter onCancel={onClose} onSave={handleSave} saving={saving} colors={colors} />}>
      {loading ? <ActivityIndicator style={{ margin: 32 }} color={colors.primary} /> : (
        config.fields.map(field => {
          if (field.type === 'toggle') {
            return <ToggleRow key={field.key} label={field.label} value={form[field.key]} onValueChange={set(field.key)} colors={colors} />;
          }
          if (field.type === 'select') {
            return (
              <SelectRow key={field.key} label={field.label} value={form[field.key]}
                options={field.options} onChange={set(field.key)} colors={colors} />
            );
          }
          return (
            <TextRow key={field.key} label={field.label} value={form[field.key]} onChangeText={set(field.key)}
              placeholder={field.placeholder} colors={colors} multiline={field.multiline}
              keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'} />
          );
        })
      )}
    </ModalShell>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────

const SettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch  = useDispatch();
  const themePref = useSelector(s => s.theme?.mode || 'auto');
  const language  = useSelector(s => s.language?.code || 'en');
  const user      = useSelector(s => s.auth.user);
  const plan      = useSelector(s => s.plan);
  const cloudAi   = useSelector(s => s.workspace.cloudAi);

  const [notifEnabled, setNotifEnabled] = useState(
    () => notifStorage.getString('notif_enabled') !== 'false'
  );
  const handleNotifToggle = useCallback((val) => {
    setNotifEnabled(val);
    notifStorage.set('notif_enabled', val ? 'true' : 'false');
  }, []);

  const [showLanguageModal,   setShowLanguageModal]   = useState(false);
  const [showCloudAiModal,    setShowCloudAiModal]    = useState(false);
  const [showExportModal,     setShowExportModal]     = useState(false);
  const [showAIShowcase,      setShowAIShowcase]      = useState(false);
  const [showCompanyModal,    setShowCompanyModal]    = useState(false);
  const [showWorkspaceModal,  setShowWorkspaceModal]  = useState(false);
  const [showEmailModal,      setShowEmailModal]      = useState(false);
  const [showWhatsAppModal,   setShowWhatsAppModal]   = useState(false);
  const [showPasswordModal,   setShowPasswordModal]   = useState(false);
  const [activeModuleKey,     setActiveModuleKey]     = useState(null);

  const [currentPassword,   setCurrentPassword]   = useState('');
  const [newPassword,       setNewPassword]        = useState('');
  const [confirmPassword,   setConfirmPassword]    = useState('');
  const [changingPassword,  setChangingPassword]   = useState(false);

  const handleThemeToggle = useCallback(() => {
    dispatch(setThemeMode(themePref === 'auto' ? 'dark' : themePref === 'dark' ? 'light' : 'auto'));
  }, [themePref, dispatch]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  }, [dispatch]);

  const closePasswordModal = useCallback(() => {
    setShowPasswordModal(false);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim()) { Alert.alert('Required', 'Enter your current password'); return; }
    if (newPassword.length < 6)  { Alert.alert('Invalid', 'New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match'); return; }
    setChangingPassword(true);
    try {
      await httpClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      Alert.alert('Success', 'Password changed successfully');
      closePasswordModal();
    } catch (e) { Alert.alert('Error', friendlyError(e, 'Failed to change password')); }
    finally { setChangingPassword(false); }
  }, [currentPassword, newPassword, confirmPassword, closePasswordModal]);

  const languageOptions  = getLanguageOptions();
  const currentLangName  = languageOptions.find(l => l.code === language)?.nativeName || 'English';
  const isAdmin          = user?.role === 'admin' || user?.is_admin === true;

  const themeLabel = themePref === 'dark' ? 'Dark' : themePref === 'light' ? 'Light' : 'Auto';

  // ── Section definitions ──────────────────────────────────────────────────────

  const generalSections = [
    ...(isAdmin ? [{
      title: 'Company',
      items: [
        { icon: 'business-outline', label: 'Company Settings', hint: 'GST, address, contact info', onPress: () => setShowCompanyModal(true) },
        { icon: 'globe-outline',    label: 'Workspace',        hint: 'Name and URL',                onPress: () => setShowWorkspaceModal(true) },
      ],
    }] : []),
    {
      title: 'Appearance',
      items: [
        { icon: 'moon-outline',     label: 'Theme',    value: themeLabel, type: 'toggle', action: handleThemeToggle, toggleValue: themePref !== 'light' },
        { icon: 'language-outline', label: 'Language', value: currentLangName, onPress: () => setShowLanguageModal(true) },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle', action: handleNotifToggle, toggleValue: notifEnabled },
      ],
    },
    ...(isAdmin ? [{
      title: 'Communication',
      items: [
        { icon: 'mail-outline',       label: 'Email / SMTP', hint: 'Outgoing email configuration', onPress: () => setShowEmailModal(true) },
        { icon: 'logo-whatsapp',      label: 'WhatsApp',     hint: 'WAHA integration',              onPress: () => setShowWhatsAppModal(true) },
      ],
    }] : []),
    ...(isAdmin ? [{
      title: 'AI Assistant',
      items: [
        { icon: 'sparkles-outline',   label: 'Cloud AI',    value: cloudAi.enabled ? (cloudAi.provider ? `${cloudAi.provider} · ${cloudAi.model || ''}`.trim() : 'Enabled') : 'Not configured', badge: cloudAi.enabled ? 'ON' : null, onPress: () => setShowCloudAiModal(true) },
        { icon: 'play-circle-outline',label: 'AI Features', value: 'Preview & Demo', onPress: () => setShowAIShowcase(true) },
      ],
    }] : []),
    {
      title: 'Account',
      items: [
        { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => setShowPasswordModal(true) },
        { icon: 'person-outline',      label: 'Profile',         onPress: () => navigation.navigate('Profile') },
      ],
    },
    {
      title: 'Data & Export',
      items: [
        { icon: 'download-outline', label: 'Export Data', value: isAdmin ? 'Full workspace + scheduled' : 'Your data only', onPress: () => setShowExportModal(true) },
      ],
    },
    ...(isAdmin ? [{
      title: 'Modules & Billing',
      items: [
        { icon: 'apps-outline',   label: 'Installed Modules', value: `${plan?.selected_modules?.length || 0} active`, onPress: () => navigation.navigate('BillingPlan') },
        { icon: 'receipt-outline',label: 'Payment History',                                                            onPress: () => navigation.navigate('PaymentHistory') },
      ],
    }] : []),
  ];

  return (
    <>
      <ScrollView style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Settings</Text>
          <Text style={[s.headerSub,   { color: colors.textSecondary }]}>Manage your workspace preferences</Text>
        </View>

        <View style={s.content}>
          {/* General sections */}
          {generalSections.map((section, idx) => (
            <View key={idx} style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
              <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
                {section.items.map((item, iIdx) => (
                  item.type === 'toggle' ? (
                    <View key={iIdx} style={[s.settingRow, { borderBottomColor: colors.border }]}>
                      <TouchableOpacity style={s.settingLeft} onPress={item.action} activeOpacity={0.7}>
                        <Icon name={item.icon} size={22} color={colors.text} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[s.settingLabel, { color: colors.text }]}>{item.label}</Text>
                          {item.hint && <Text style={[s.settingHint, { color: colors.textLight }]}>{item.hint}</Text>}
                        </View>
                      </TouchableOpacity>
                      <View style={s.settingRight}>
                        {item.value && <Text style={[s.settingValue, { color: colors.textSecondary }]}>{item.value}</Text>}
                        <Switch value={!!item.toggleValue} onValueChange={item.action}
                          trackColor={{ false: colors.border, true: colors.primary + '50' }}
                          thumbColor={item.toggleValue ? colors.primary : colors.textSecondary} />
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity key={iIdx} onPress={item.onPress || item.action}
                      style={[s.settingRow, { borderBottomColor: colors.border }]} activeOpacity={0.7}>
                      <View style={s.settingLeft}>
                        <Icon name={item.icon} size={22} color={colors.text} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={[s.settingLabel, { color: colors.text }]}>{item.label}</Text>
                          {item.hint && <Text style={[s.settingHint, { color: colors.textLight }]}>{item.hint}</Text>}
                        </View>
                      </View>
                      <View style={s.settingRight}>
                        {item.badge && <View style={s.onBadge}><Text style={s.onBadgeText}>{item.badge}</Text></View>}
                        {item.value && <Text style={[s.settingValue, { color: colors.textSecondary }]} numberOfLines={1}>{item.value}</Text>}
                        <Icon name="chevron-forward-outline" size={18} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  )
                ))}
              </View>
            </View>
          ))}

          {/* Module Settings — admin only */}
          {isAdmin && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Module Settings</Text>
              <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
                {MODULE_ORDER.map(key => {
                  const cfg = MODULE_SETTINGS_CONFIG[key];
                  return (
                    <TouchableOpacity key={key} style={[s.settingRow, { borderBottomColor: colors.border }]}
                      onPress={() => setActiveModuleKey(key)} activeOpacity={0.7}>
                      <View style={s.settingLeft}>
                        <Icon name={cfg.icon} size={22} color={colors.text} />
                        <Text style={[s.settingLabel, { color: colors.text, marginLeft: 12 }]}>{cfg.title}</Text>
                      </View>
                      <Icon name="chevron-forward-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Sign Out */}
          <View style={s.section}>
            <View style={[s.sectionCard, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={[s.settingRow, { borderBottomColor: 'transparent' }]} onPress={handleSignOut} activeOpacity={0.7}>
                <View style={s.settingLeft}>
                  <Icon name="log-out-outline" size={22} color={colors.error || '#EF4444'} />
                  <Text style={[s.settingLabel, { color: colors.error || '#EF4444', marginLeft: 12 }]}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Modals */}
      <LanguageModal   visible={showLanguageModal}  onClose={() => setShowLanguageModal(false)}  colors={colors} dispatch={dispatch} currentLanguage={language} />
      <CloudAIModal    visible={showCloudAiModal}   onClose={() => setShowCloudAiModal(false)}   colors={colors} dispatch={dispatch} />
      <CompanySettingsModal visible={showCompanyModal}   onClose={() => setShowCompanyModal(false)}   colors={colors} />
      <WorkspaceModal  visible={showWorkspaceModal} onClose={() => setShowWorkspaceModal(false)} colors={colors} />
      <EmailModal      visible={showEmailModal}     onClose={() => setShowEmailModal(false)}     colors={colors} />
      <WhatsAppModal   visible={showWhatsAppModal}  onClose={() => setShowWhatsAppModal(false)}  colors={colors} />
      <ModuleSettingsModal visible={!!activeModuleKey} onClose={() => setActiveModuleKey(null)} moduleKey={activeModuleKey} colors={colors} />

      <ExportDataModal visible={showExportModal} onClose={() => setShowExportModal(false)} isAdmin={isAdmin} />
      <AIFeaturesShowcase visible={showAIShowcase} onClose={() => setShowAIShowcase(false)} />

      {/* Change Password modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={closePasswordModal}>
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.pwModal, { backgroundColor: colors.surface }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={closePasswordModal} disabled={changingPassword}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <TextRow label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" colors={colors} secureTextEntry />
              <TextRow label="New Password"     value={newPassword}     onChangeText={setNewPassword}     placeholder="Min 6 characters"       colors={colors} secureTextEntry />
              <TextRow label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password"     colors={colors} secureTextEntry />
            </View>
            <View style={[s.modalFooter, { borderTopColor: colors.border }]}>
              <SaveCancelFooter onCancel={closePasswordModal} onSave={handleChangePassword} saving={changingPassword} colors={colors} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Screen
  container:    { flex: 1 },
  header:       { padding: 16, borderBottomWidth: 1 },
  headerTitle:  { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  headerSub:    { fontSize: 14 },
  content:      { padding: 12 },
  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  sectionCard:  { borderRadius: 12, overflow: 'hidden' },
  settingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingLabel: { fontSize: 14 },
  settingHint:  { fontSize: 11, marginTop: 2 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 12, maxWidth: 140 },
  onBadge:      { backgroundColor: '#4CAF5020', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  onBadgeText:  { fontSize: 10, fontWeight: '800', color: '#4CAF50' },
  // Modal shell
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCard:    { margin: 16, borderRadius: 16, overflow: 'hidden', width: '92%', maxHeight: '88%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modalTitle:   { fontSize: 16, fontWeight: '700' },
  modalBody:    { padding: 16 },
  modalFooter:  { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  modalBtn:     { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
  modalBtnTextPrimary: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // Form fields
  fieldLabel:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  fieldInput:   { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 14 },
  fieldHint:    { fontSize: 12, marginTop: 2 },
  readOnly:     { justifyContent: 'center' },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  toggleLabel:  { flex: 1, fontSize: 14 },
  selectRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  selectOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  selectOptionText: { fontSize: 13, fontWeight: '500' },
  // Language modal
  langRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  langFlag:     { fontSize: 28 },
  langLabel:    { fontSize: 14, fontWeight: '600' },
  langNative:   { fontSize: 12, marginTop: 2 },
  // Provider selector
  providerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  providerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  providerLabel:{ fontSize: 14, fontWeight: '600' },
  providerHint: { fontSize: 12, marginTop: 1 },
  keyNote:      { fontSize: 11, marginBottom: 12 },
  testBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginBottom: 4 },
  testBtnText:  { fontSize: 14, fontWeight: '600' },
  // Email presets
  presetRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  presetChip:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5 },
  presetChipText:{ fontSize: 12, fontWeight: '600' },
  // WhatsApp
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  statusText:   { fontSize: 13, fontWeight: '500' },
  // Password modal
  pwModal:      { width: '90%', borderRadius: 16, overflow: 'hidden' },
});

export default SettingsScreen;
