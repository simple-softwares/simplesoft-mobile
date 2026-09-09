// ── Shared demo data for the Telecaller module ────────────────────────────────

export const initials = name =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2);

export const AGENTS = [
  { id: 1, name: 'Kavita Singh', role: 'Team Lead',      color: '#22C55E', dials: 42, target: 50, connects: 28, conversions: 11 },
  { id: 2, name: 'Rahul Patel',  role: 'Senior Caller',  color: '#3B82F6', dials: 38, target: 50, connects: 22, conversions: 9  },
  { id: 3, name: 'Neha Gupta',   role: 'Senior Caller',  color: '#A855F7', dials: 45, target: 50, connects: 31, conversions: 13 },
  { id: 4, name: 'Vikram Joshi', role: 'Caller',         color: '#F59E0B', dials: 29, target: 40, connects: 14, conversions: 4  },
  { id: 5, name: 'Anjali Mehta', role: 'Caller',         color: '#F43F5E', dials: 33, target: 40, connects: 18, conversions: 6  },
  { id: 6, name: 'Suresh Kumar', role: 'Junior Caller',  color: '#14B8A6', dials: 21, target: 30, connects: 9,  conversions: 2  },
];

export const DISPOSITIONS = ['All', 'Interested', 'Not Interested', 'Call Back', 'DNC', 'Voicemail', 'No Answer'];

export const DISP_CFG = {
  'Interested':     { color: '#16A34A', bg: '#16A34A18', icon: 'call-outline'          },
  'Not Interested': { color: '#EF4444', bg: '#EF444418', icon: 'call-outline'          },
  'Call Back':      { color: '#3B82F6', bg: '#3B82F618', icon: 'repeat-outline'        },
  'DNC':            { color: '#9CA3AF', bg: '#9CA3AF18', icon: 'ban-outline'           },
  'Voicemail':      { color: '#D97706', bg: '#D9770618', icon: 'phone-portrait-outline'},
  'No Answer':      { color: '#F43F5E', bg: '#F43F5E18', icon: 'call-outline'          },
};

export const RECENT_CALLS = [
  { agent: 'Neha Gupta',   customer: 'Rajesh Agarwal', phone: '98765 01001', time: '11:52 AM', disposition: 'Interested'    },
  { agent: 'Kavita Singh', customer: 'Prerna Khanna',  phone: '98765 02002', time: '11:44 AM', disposition: 'Call Back'     },
  { agent: 'Rahul Patel',  customer: 'Dinesh Soni',    phone: '98765 03003', time: '11:38 AM', disposition: 'Not Interested'},
  { agent: 'Anjali Mehta', customer: 'Meena Trivedi',  phone: '98765 04004', time: '11:30 AM', disposition: 'Interested'    },
  { agent: 'Neha Gupta',   customer: 'Sandeep Yadav',  phone: '98765 05005', time: '11:21 AM', disposition: 'DNC'           },
  { agent: 'Vikram Joshi', customer: 'Alka Mishra',    phone: '98765 06006', time: '11:14 AM', disposition: 'Call Back'     },
];

export const DEMO_CALLS = [
  { id: 1,  agent: 'Neha Gupta',   customer: 'Rajesh Agarwal',   phone: '98765 01001', duration: '3:42', disposition: 'Interested',     date: '22 May', time: '11:52 AM', notes: 'Interested in the Pro plan. Send brochure.' },
  { id: 2,  agent: 'Kavita Singh', customer: 'Prerna Khanna',    phone: '98765 02002', duration: '1:18', disposition: 'Call Back',       date: '22 May', time: '11:44 AM', notes: 'Will decide by Friday. Call back Thursday.' },
  { id: 3,  agent: 'Rahul Patel',  customer: 'Dinesh Soni',      phone: '98765 03003', duration: '0:55', disposition: 'Not Interested',  date: '22 May', time: '11:38 AM', notes: 'Already using a competitor.' },
  { id: 4,  agent: 'Anjali Mehta', customer: 'Meena Trivedi',    phone: '98765 04004', duration: '4:10', disposition: 'Interested',      date: '22 May', time: '11:30 AM', notes: 'Demo scheduled for 25th May 11 AM.' },
  { id: 5,  agent: 'Neha Gupta',   customer: 'Sandeep Yadav',    phone: '98765 05005', duration: '0:22', disposition: 'DNC',             date: '22 May', time: '11:21 AM', notes: 'Requested DNC — added to blocklist.' },
  { id: 6,  agent: 'Vikram Joshi', customer: 'Alka Mishra',      phone: '98765 06006', duration: '2:05', disposition: 'Call Back',       date: '22 May', time: '11:14 AM', notes: 'On leave today. Call back Monday.' },
  { id: 7,  agent: 'Kavita Singh', customer: 'Sunil Chaturvedi', phone: '98765 07007', duration: '5:33', disposition: 'Interested',      date: '22 May', time: '11:01 AM', notes: 'Ready to upgrade — sent pricing email.' },
  { id: 8,  agent: 'Suresh Kumar', customer: 'Pooja Tiwari',     phone: '98765 08008', duration: '0:00', disposition: 'No Answer',       date: '22 May', time: '10:55 AM', notes: '' },
  { id: 9,  agent: 'Rahul Patel',  customer: 'Hemant Dubey',     phone: '98765 09009', duration: '1:47', disposition: 'Voicemail',       date: '22 May', time: '10:48 AM', notes: 'Left voicemail about the offer.' },
  { id: 10, agent: 'Anjali Mehta', customer: 'Kaveri Sharma',    phone: '98765 10010', duration: '2:59', disposition: 'Not Interested',  date: '22 May', time: '10:41 AM', notes: 'Budget constraints this quarter.' },
  { id: 11, agent: 'Neha Gupta',   customer: 'Arjun Bhatt',      phone: '98765 11011', duration: '3:18', disposition: 'Interested',      date: '22 May', time: '10:32 AM', notes: 'Wants team of 5 accounts. High potential.' },
  { id: 12, agent: 'Vikram Joshi', customer: 'Rekha Singh',      phone: '98765 12012', duration: '0:00', disposition: 'No Answer',       date: '22 May', time: '10:25 AM', notes: '' },
  { id: 13, agent: 'Kavita Singh', customer: 'Naresh Patel',     phone: '98765 13013', duration: '4:44', disposition: 'Call Back',       date: '21 May', time: '4:50 PM',  notes: 'Meeting tomorrow. Following up then.' },
  { id: 14, agent: 'Rahul Patel',  customer: 'Geeta Malhotra',   phone: '98765 14014', duration: '2:21', disposition: 'Interested',      date: '21 May', time: '4:32 PM',  notes: 'Trial access requested — sent login.' },
  { id: 15, agent: 'Suresh Kumar', customer: 'Mahesh Verma',     phone: '98765 15015', duration: '1:05', disposition: 'Not Interested',  date: '21 May', time: '4:18 PM',  notes: 'Not the decision maker.' },
];

export const PERIOD_DATA = {
  today: [
    { name: 'Neha Gupta',   role: 'Senior Caller', color: '#A855F7', dials: 45, target: 50,   connects: 31,  conversions: 13,  rate: 42, avgDuration: '3:12', trend: 'up'   },
    { name: 'Kavita Singh', role: 'Team Lead',     color: '#22C55E', dials: 42, target: 50,   connects: 28,  conversions: 11,  rate: 39, avgDuration: '2:55', trend: 'up'   },
    { name: 'Anjali Mehta', role: 'Caller',        color: '#F43F5E', dials: 33, target: 40,   connects: 18,  conversions: 6,   rate: 33, avgDuration: '2:40', trend: 'up'   },
    { name: 'Rahul Patel',  role: 'Senior Caller', color: '#3B82F6', dials: 38, target: 50,   connects: 22,  conversions: 9,   rate: 41, avgDuration: '2:20', trend: 'flat' },
    { name: 'Vikram Joshi', role: 'Caller',        color: '#F59E0B', dials: 29, target: 40,   connects: 14,  conversions: 4,   rate: 29, avgDuration: '1:55', trend: 'down' },
    { name: 'Suresh Kumar', role: 'Junior Caller', color: '#14B8A6', dials: 21, target: 30,   connects: 9,   conversions: 2,   rate: 22, avgDuration: '1:30', trend: 'down' },
  ],
  week: [
    { name: 'Neha Gupta',   role: 'Senior Caller', color: '#A855F7', dials: 218, target: 250,  connects: 148, conversions: 61,  rate: 41, avgDuration: '3:08', trend: 'up'   },
    { name: 'Kavita Singh', role: 'Team Lead',     color: '#22C55E', dials: 204, target: 250,  connects: 131, conversions: 54,  rate: 41, avgDuration: '2:58', trend: 'up'   },
    { name: 'Rahul Patel',  role: 'Senior Caller', color: '#3B82F6', dials: 188, target: 250,  connects: 108, conversions: 44,  rate: 41, avgDuration: '2:25', trend: 'up'   },
    { name: 'Anjali Mehta', role: 'Caller',        color: '#F43F5E', dials: 161, target: 200,  connects: 84,  conversions: 27,  rate: 32, avgDuration: '2:38', trend: 'flat' },
    { name: 'Vikram Joshi', role: 'Caller',        color: '#F59E0B', dials: 140, target: 200,  connects: 63,  conversions: 18,  rate: 29, avgDuration: '1:58', trend: 'flat' },
    { name: 'Suresh Kumar', role: 'Junior Caller', color: '#14B8A6', dials: 98,  target: 150,  connects: 38,  conversions: 8,   rate: 21, avgDuration: '1:35', trend: 'down' },
  ],
  month: [
    { name: 'Neha Gupta',   role: 'Senior Caller', color: '#A855F7', dials: 884, target: 1000, connects: 591, conversions: 246, rate: 42, avgDuration: '3:14', trend: 'up'   },
    { name: 'Kavita Singh', role: 'Team Lead',     color: '#22C55E', dials: 820, target: 1000, connects: 541, conversions: 221, rate: 41, avgDuration: '3:01', trend: 'up'   },
    { name: 'Rahul Patel',  role: 'Senior Caller', color: '#3B82F6', dials: 756, target: 1000, connects: 432, conversions: 178, rate: 41, avgDuration: '2:31', trend: 'up'   },
    { name: 'Anjali Mehta', role: 'Caller',        color: '#F43F5E', dials: 640, target: 800,  connects: 334, conversions: 110, rate: 33, avgDuration: '2:42', trend: 'flat' },
    { name: 'Vikram Joshi', role: 'Caller',        color: '#F59E0B', dials: 558, target: 800,  connects: 251, conversions: 72,  rate: 29, avgDuration: '2:02', trend: 'flat' },
    { name: 'Suresh Kumar', role: 'Junior Caller', color: '#14B8A6', dials: 390, target: 600,  connects: 155, conversions: 30,  rate: 19, avgDuration: '1:38', trend: 'down' },
  ],
};
