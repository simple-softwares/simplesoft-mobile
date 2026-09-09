// Light palette — matches frontend Tailwind config (blue primary)
export const light = {
  primary:       '#2196F3',
  primaryLight:  '#64B5F6',
  primaryDark:   '#1565C0',
  secondary:     '#F59E0B',
  success:       '#10B981',
  warning:       '#F59E0B',
  error:         '#EF4444',
  info:          '#6366F1',

  background:    '#F8FAFC',
  surface:       '#FFFFFF',
  card:          '#FFFFFF',
  text:          '#0F172A',
  textSecondary: '#475569',
  textLight:     '#94A3B8',
  border:        '#E2E8F0',
  divider:       '#F1F5F9',
  blockSelected: '#EFF6FF',
  blockHover:    '#F0F9FF',
};

// Dark palette — blue brand
export const dark = {
  primary:       '#64B5F6',
  primaryLight:  '#90CAF9',
  primaryDark:   '#2196F3',
  secondary:     '#FCD34D',
  success:       '#34D399',
  warning:       '#FCD34D',
  error:         '#F87171',
  info:          '#818CF8',

  background:    '#0D0D14',
  surface:       '#16161F',
  card:          '#1E1E2A',
  text:          '#E8E8F0',
  textSecondary: '#94A3B8',
  textLight:     '#475569',
  border:        '#2A2A3A',
  divider:       '#222230',
  blockSelected: '#1E2A3A',
  blockHover:    '#182030',
};

// Default export stays light for backward-compat
export default light;
