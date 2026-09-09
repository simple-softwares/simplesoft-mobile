import api from '../../services/api/httpClient';

// ── Badge definitions ────────────────────────────────────────
export const BADGES = [
  { id: 'streak_5',    emoji: '🔥', name: 'On Fire',          desc: '5-day attendance streak',              check: s => s.streak >= 5          },
  { id: 'streak_21',   emoji: '🌋', name: 'Unstoppable',      desc: '21-day attendance streak',             check: s => s.streak >= 21         },
  { id: 'tasks_10',    emoji: '⚡', name: 'Task Crusher',     desc: '10+ tasks completed',                  check: s => s.tasksCompleted >= 10 },
  { id: 'tasks_25',    emoji: '🚀', name: 'Productivity Pro', desc: '25+ tasks completed',                  check: s => s.tasksCompleted >= 25 },
  { id: 'perfect_week',emoji: '🎯', name: 'Perfect Week',     desc: 'Full attendance this week (5 days)',   check: s => s.weekAttendance >= 5  },
  { id: 'early_bird',  emoji: '🌅', name: 'Early Bird',       desc: '5+ check-ins before 9:30 AM',         check: s => s.earlyCheckIns >= 5   },
  { id: 'zero_absence',emoji: '🤝', name: 'Zero Absence',     desc: 'No leaves this month',                check: s => s.monthLeaves === 0    },
  { id: 'consistent',  emoji: '📅', name: 'Consistent',       desc: '20+ days present this month',         check: s => s.monthAttendance >= 20},
  { id: 'pts_100',     emoji: '💯', name: 'Century',          desc: 'Earned 100+ points',                  check: s => s.totalPoints >= 100   },
  { id: 'pts_300',     emoji: '🏆', name: 'Champion',         desc: 'Earned 300+ points',                  check: s => s.totalPoints >= 300   },
  { id: 'pts_500',     emoji: '👑', name: 'Legend',           desc: 'Earned 500+ points (bonus eligible)', check: s => s.totalPoints >= 500   },
];

export const INCENTIVE_TARGET = 500;

export function computeScore(attendanceLogs, tasksCompleted, leaves, weekAttendanceDays) {
  let pts   = 0;
  let early = 0;

  const attendanceDates = new Set(
    attendanceLogs.map(l => l.check_in?.split(' ')?.[0] || l.check_in?.split('T')?.[0])
  );
  const sortedDates = [...attendanceDates].sort();
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const d = new Date(sortedDates[i]); d.setHours(0,0,0,0);
    const diff = Math.round((today - d) / 86400000);
    if (diff <= streak + 2) { streak++; } else { break; }
  }

  const monthAttendance = attendanceDates.size;
  pts += monthAttendance * 5;

  for (const log of attendanceLogs) {
    const timePart = (log.check_in || '').split(' ')?.[1] || '';
    const [hh] = timePart.split(':').map(Number);
    if (!isNaN(hh) && hh < 9) { early++; pts += 3; }
    else if (!isNaN(hh) && hh === 9) {
      const mm = parseInt(timePart.split(':')[1] || '59', 10);
      if (mm < 30) { early++; pts += 3; }
    }
  }

  if (streak > 3) pts += (streak - 3) * 2;
  pts += tasksCompleted * 10;

  return {
    totalPoints: pts,
    monthAttendance,
    weekAttendance: weekAttendanceDays,
    streak,
    earlyCheckIns: early,
    tasksCompleted,
    monthLeaves: leaves,
    breakdown: {
      attendance: monthAttendance * 5,
      earlyBonus: early * 3,
      streakBonus: streak > 3 ? (streak - 3) * 2 : 0,
      tasks: tasksCompleted * 10,
    },
  };
}

export function computeBadges(stats) {
  return BADGES.map(b => ({ ...b, earned: b.check(stats) }));
}

export function getPeriodDates(period = 'month') {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  if (period === 'week') {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    return { from: mon.toISOString().split('T')[0], to: today };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: first.toISOString().split('T')[0], to: today };
}

const performanceService = {
  BADGES,
  INCENTIVE_TARGET,
  computeScore,
  computeBadges,
  getPeriodDates,

  async getMyStats(employeeId, userId, period = 'month') {
    try {
      const { data } = await api.get('/hr/performance/stats', {
        params: { period, employee_id: employeeId, user_id: userId },
      });
      const stats = computeScore(
        data.attendance || [],
        data.tasks_completed || 0,
        data.leaves || 0,
        data.week_attendance || 0,
      );
      const badges = computeBadges(stats);
      const { from, to } = getPeriodDates(period);
      return { ...stats, badges, period, from, to };
    } catch {
      const emptyStats = computeScore([], 0, 0, 0);
      const { from, to } = getPeriodDates(period);
      return { ...emptyStats, badges: computeBadges(emptyStats), period, from, to };
    }
  },

  async getLeaderboardData(period = 'month') {
    try {
      const { data } = await api.get('/hr/performance/leaderboard', { params: { period } });
      return data || [];
    } catch {
      return [];
    }
  },
};

export default performanceService;
