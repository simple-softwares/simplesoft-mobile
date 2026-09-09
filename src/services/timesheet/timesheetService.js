import api from '../api/httpClient';
import { storage } from '../storage/mmkv';

const TIMER_KEY = 'active_timer';

class TimesheetService {

  startTimer(taskId, projectId, taskName) {
    const timer = { taskId, projectId, taskName, startTime: Date.now() };
    storage.set(TIMER_KEY, JSON.stringify(timer));
    return timer;
  }

  getActiveTimer() {
    const data = storage.getString(TIMER_KEY);
    return data ? JSON.parse(data) : null;
  }

  getElapsedSeconds() {
    const timer = this.getActiveTimer();
    if (!timer) return 0;
    return Math.floor((Date.now() - timer.startTime) / 1000);
  }

  async stopAndLog(description = '') {
    const timer = this.getActiveTimer();
    if (!timer) throw new Error('No active timer');

    const elapsedSeconds = this.getElapsedSeconds();
    const hours = elapsedSeconds / 3600;

    if (hours < 0.01) {
      storage.delete(TIMER_KEY);
      throw new Error('Too short to log (< 30s)');
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data } = await api.post(`/tasks/${timer.taskId}/timesheets`, {
        task_id:     timer.taskId,
        project_id:  timer.projectId,
        description: description || `Work on ${timer.taskName}`,
        hours:       Math.round(hours * 100) / 100,
        date:        today,
      });
      storage.delete(TIMER_KEY);
      return {
        success: true,
        id: data?.id,
        hours: Math.round(hours * 100) / 100,
        elapsedSeconds,
      };
    } catch (error) {
      throw error;
    }
  }

  discardTimer() {
    storage.delete(TIMER_KEY);
  }

  async getTaskTimesheets(taskId) {
    try {
      const { data } = await api.get(`/tasks/${taskId}/timesheets`);
      return data || [];
    } catch {
      return [];
    }
  }

  formatElapsed(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  formatHours(decimalHours) {
    if (!decimalHours) return '0h 0m';
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  }
}

export default new TimesheetService();
