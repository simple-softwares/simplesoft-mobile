import AttendanceScreen from './screens/AttendanceScreen';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';

export default {
  key:        'attendance',
  label:      'Attendance',
  icon:       'time-outline',
  iconActive: 'time',
  color:      '#4CAF50',
  tabs: [
    { name: 'Attendance', label: 'Check In', icon: 'log-in-outline', iconActive: 'log-in', component: AttendanceScreen },
    { name: 'AttendanceHistory', label: 'History', icon: 'calendar-outline', iconActive: 'calendar', component: AttendanceHistoryScreen },
  ],
};
