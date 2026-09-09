import LeaveListScreen from './screens/LeaveListScreen';
import LeaveRequestScreen from './screens/LeaveRequestScreen';
import LeaveDetailScreen from './screens/LeaveDetailScreen';

export default {
  key:        'leave',
  label:      'Leaves',
  icon:       'calendar-outline',
  iconActive: 'calendar',
  color:      '#3B82F6',
  tabs: [
    { name: 'LeaveList', label: 'My Leaves', icon: 'calendar-outline', iconActive: 'calendar', component: LeaveListScreen },
  ],
  screens: [
    { name: 'LeaveRequest', label: 'Request Leave', component: LeaveRequestScreen },
    { name: 'LeaveDetail', label: 'Leave Details', component: LeaveDetailScreen },
  ],
};
