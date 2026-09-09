/**
 * REFACTORED: Now delegates to BackendService instead of direct callOdoo
 * API is identical — screens don't need to change
 * But now switching backends is transparent to this service
 */

import backend from '../../backend/BackendService';
import { TASK_PRIORITIES } from '../../config';

class ProjectService {

  /**
   * Get tasks with optional domain filtering
   * @param {any[]} domain Odoo-style domain (ignored by CustomAdapter)
   * @param {number} limit
   * @returns {Promise<Task[]>}
   */
  async getTasks(domain = [], limit = 500) {
    try {
      return await backend.getTasks(domain, { limit, order: 'priority desc, date_deadline asc' });
    } catch (e) {
      return [];
    }
  }

  /**
   * Get projects
   * @param {any[]} domain Odoo-style domain
   * @param {number} limit
   * @returns {Promise<Project[]>}
   */
  async getProjects(domain = [], limit = 100) {
    try {
      return await backend.getProjects(domain, { limit });
    } catch (e) {
      return [];
    }
  }

  /**
   * Get tasks assigned to a user
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Task[]>}
   */
  async getMyTasks(userId, limit = 100) {
    return backend.getMyTasks(userId, limit).catch(e => {
      return [];
    });
  }

  async getAllTasks(limit = 200) {
    return backend.getAllTasks(limit).catch(() => []);
  }

  /**
   * Get tasks for a project
   * @param {number} projectId
   * @param {number} limit
   * @returns {Promise<Task[]>}
   */
  async getProjectTasks(projectId, limit = 100) {
    return this.getTasks([['project_id', '=', projectId]], limit);
  }

  /**
   * Get overdue (not-yet-closed) tasks
   * @returns {Promise<Task[]>}
   */
  async getOverdueTasks() {
    try {
      const today = new Date().toISOString().split('T')[0];
      return await backend.getTasks([
        ['date_deadline', '<', today],
        ['stage_id.fold', '=', false],
      ]);
    } catch (e) {
      return [];
    }
  }

  /**
   * Get a single task by ID
   * @param {number} taskId
   * @returns {Promise<Task|null>}
   */
  async getTaskById(taskId) {
    try {
      return await backend.getTask(taskId);
    } catch (e) {
      return null;
    }
  }

  /**
   * Get task stages/statuses
   * @param {number|null} projectId  null = all stages
   * @returns {Promise<Stage[]>}
   */
  async getTaskStages(projectId = null) {
    try {
      return await backend.getStages(projectId);
    } catch (e) {
      return [];
    }
  }

  async createStage(name, projectId = null) {
    return backend.createStage(name, projectId);
  }

  async updateStage(stageId, vals) {
    return backend.updateStage(stageId, vals);
  }

  async deleteStage(stageId) {
    return backend.deleteStage(stageId);
  }

  /**
   * Create a task
   * @param {object} vals Task data
   * @returns {Promise<number>} Task ID
   */
  async createTask(vals) {
    return backend.createTask(vals);
  }

  /**
   * Update a task
   * @param {number} taskId
   * @param {object} vals Fields to update
   * @returns {Promise<void>}
   */
  async updateTask(taskId, vals) {
    return backend.updateTask(taskId, vals);
  }

  /**
   * Delete a task
   * @param {number} taskId
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    return backend.deleteTask(taskId);
  }

  // ── Helpers ──
  getPriorityColor(p) {
    return TASK_PRIORITIES[p?.toString()]?.color || '#9E9E9E';
  }

  getPriorityLabel(p) {
    return TASK_PRIORITIES[p?.toString()]?.label || 'Normal';
  }

  getPriorityIcon(p) {
    return TASK_PRIORITIES[p?.toString()]?.icon || '➡️';
  }

  getStageColor(stage) {
    if (!stage) return '#9E9E9E';
    const cols = ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];
    const h = Math.abs((stage.name || '').split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
    return cols[h % cols.length];
  }

  formatHours(h) {
    if (!h) return '0h';
    return h < 1 ? `${Math.round(h * 60)}m` : `${Math.round(h * 10) / 10}h`;
  }
}

export default new ProjectService();
