import BulkImportScreen from './BulkImportScreen';

export default {
  key:        'import',
  label:      'Bulk Import',
  icon:       'cloud-upload-outline',
  iconActive: 'cloud-upload',
  color:      '#FF9800',
  tabs: [
    { name: 'BulkImport', label: 'Import Employees', icon: 'cloud-upload-outline', iconActive: 'cloud-upload', component: BulkImportScreen },
  ],
};
