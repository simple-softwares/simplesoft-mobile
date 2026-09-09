/**
 * CustomAdapter — REST-based adapter for your custom backend
 *
 * This is a stub implementation that uses clean REST endpoints.
 * Replace 'Not yet implemented' with your custom backend API calls.
 *
 * All methods return the same data shapes as OdooAdapter,
 * so the app never knows it's using a different backend.
 *
 * Endpoints (pattern):
 *   POST   /api/auth/login        → { uid, name, email, ... }
 *   POST   /api/auth/logout       → {}
 *   GET    /api/tasks             → [{ id, name, projectId, ... }]
 *   GET    /api/tasks/{id}        → { id, name, projectId, ... }
 *   POST   /api/tasks             → { id }
 *   PATCH  /api/tasks/{id}        → {}
 *   DELETE /api/tasks/{id}        → {}
 *   ... and so on
 */

import { BackendInterface } from './BackendInterface';
import httpClient from '../services/api/httpClient';

class CustomAdapter extends BackendInterface {

  // ══════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ══════════════════════════════════════════════════════════════════

  async login(email, password, db) {
    throw new Error('CustomAdapter: login not yet implemented. Replace with your REST call to POST /api/auth/login');
  }

  async logout() {
    throw new Error('CustomAdapter: logout not yet implemented. Replace with your REST call to POST /api/auth/logout');
  }

  async loginWithGoogle(idToken, name, phone) {
    throw new Error('CustomAdapter: loginWithGoogle not yet implemented. Replace with your REST call to POST /api/auth/google');
  }

  async register(name, email, password, db) {
    throw new Error('CustomAdapter: register not yet implemented. Replace with your REST call to POST /api/auth/register');
    // Example implementation:
    // const res = await httpClient.post('/api/auth/register', { name, email, password });
    // return res.data; // { uid, name, email, ... }
  }

  // ══════════════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════════════

  async getTasks(domain = [], opts = {}) {
    // Example implementation:
    // const res = await httpClient.get('/api/tasks', {
    //   params: { limit: opts.limit || 100, offset: opts.offset || 0, order: opts.order }
    // });
    // return res.data.tasks;

    throw new Error('CustomAdapter: getTasks not yet implemented. Replace with your REST call to GET /api/tasks');
  }

  async getMyTasks(userId, limit = 100) {
    // Example implementation:
    // const res = await httpClient.get(`/api/tasks/user/${userId}`, { params: { limit } });
    // return res.data.tasks;

    throw new Error('CustomAdapter: getMyTasks not yet implemented. Replace with your REST call to GET /api/tasks/user/:userId');
  }

  async getTask(taskId) {
    // Example implementation:
    // const res = await httpClient.get(`/api/tasks/${taskId}`);
    // return res.data;

    throw new Error('CustomAdapter: getTask not yet implemented. Replace with your REST call to GET /api/tasks/:id');
  }

  async createTask(vals) {
    // Example implementation:
    // const res = await httpClient.post('/api/tasks', vals);
    // return res.data.id;

    throw new Error('CustomAdapter: createTask not yet implemented. Replace with your REST call to POST /api/tasks');
  }

  async updateTask(taskId, vals) {
    // Example implementation:
    // await httpClient.patch(`/api/tasks/${taskId}`, vals);

    throw new Error('CustomAdapter: updateTask not yet implemented. Replace with your REST call to PATCH /api/tasks/:id');
  }

  async deleteTask(taskId) {
    // Example implementation:
    // await httpClient.delete(`/api/tasks/${taskId}`);

    throw new Error('CustomAdapter: deleteTask not yet implemented. Replace with your REST call to DELETE /api/tasks/:id');
  }

  // ══════════════════════════════════════════════════════════════════
  // PROJECTS
  // ══════════════════════════════════════════════════════════════════

  async getProjects(domain = [], opts = {}) {
    throw new Error('CustomAdapter: getProjects not yet implemented. Replace with your REST call to GET /api/projects');
  }

  async getStages(projectId) {
    throw new Error('CustomAdapter: getStages not yet implemented. Replace with your REST call to GET /api/projects/:id/stages');
  }

  // ══════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════

  async getDashboardData(userId) {
    // Example implementation:
    // const res = await httpClient.get(`/api/dashboard/${userId}`);
    // return res.data; // { stats: {...}, tasks: [...], projects: [...], contacts: [...] }

    throw new Error('CustomAdapter: getDashboardData not yet implemented. Replace with your REST call to GET /api/dashboard/:userId');
  }

  // ══════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════

  async getContacts(opts = {}) {
    // Example implementation:
    // const res = await httpClient.get('/api/contacts', { params: { search: opts.search, limit: opts.limit } });
    // return res.data.contacts;

    throw new Error('CustomAdapter: getContacts not yet implemented. Replace with your REST call to GET /api/contacts');
  }

  async getContact(contactId) {
    throw new Error('CustomAdapter: getContact not yet implemented. Replace with your REST call to GET /api/contacts/:id');
  }

  async createContact(vals) {
    throw new Error('CustomAdapter: createContact not yet implemented. Replace with your REST call to POST /api/contacts');
  }

  async updateContact(contactId, vals) {
    throw new Error('CustomAdapter: updateContact not yet implemented. Replace with your REST call to PATCH /api/contacts/:id');
  }

  async deleteContact(contactId) {
    throw new Error('CustomAdapter: deleteContact not yet implemented. Replace with your REST call to DELETE /api/contacts/:id');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEAM / MEMBERS
  // ══════════════════════════════════════════════════════════════════

  async getMembers(forceRefresh = false) {
    throw new Error('CustomAdapter: getMembers not yet implemented. Replace with your REST call to GET /api/team/members');
  }

  async getMember(userId) {
    throw new Error('CustomAdapter: getMember not yet implemented. Replace with your REST call to GET /api/team/members/:userId');
  }

  async getTeams() {
    throw new Error('CustomAdapter: getTeams not yet implemented. Replace with your REST call to GET /api/teams');
  }

  async createTeam(vals) {
    throw new Error('CustomAdapter: createTeam not yet implemented. Replace with your REST call to POST /api/teams');
  }

  async updateTeam(teamId, vals) {
    throw new Error('CustomAdapter: updateTeam not yet implemented. Replace with your REST call to PATCH /api/teams/:id');
  }

  async deleteTeam(teamId) {
    throw new Error('CustomAdapter: deleteTeam not yet implemented. Replace with your REST call to DELETE /api/teams/:id');
  }

  async addMember(teamId, userId, role) {
    throw new Error('CustomAdapter: addMember not yet implemented. Replace with your REST call to POST /api/teams/:id/members');
  }

  async removeMember(teamId, memberId) {
    throw new Error('CustomAdapter: removeMember not yet implemented. Replace with your REST call to DELETE /api/teams/:teamId/members/:memberId');
  }

  async updateMemberRole(teamId, memberId, role) {
    throw new Error('CustomAdapter: updateMemberRole not yet implemented. Replace with your REST call to PATCH /api/teams/:teamId/members/:memberId');
  }

  // ══════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════

  async getProfile(uid) {
    throw new Error('CustomAdapter: getProfile not yet implemented. Replace with your REST call to GET /api/profile/:uid');
  }

  async updateProfile(uid, vals) {
    throw new Error('CustomAdapter: updateProfile not yet implemented. Replace with your REST call to PATCH /api/profile/:uid');
  }

  async uploadPhoto(uid, base64Image) {
    throw new Error('CustomAdapter: uploadPhoto not yet implemented. Replace with your REST call to POST /api/profile/:uid/photo');
  }

  async changePassword(currentPassword, newPassword) {
    throw new Error('CustomAdapter: changePassword not yet implemented. Replace with your REST call to POST /api/profile/change-password');
  }

  // ══════════════════════════════════════════════════════════════════
  // TIMESHEETS
  // ══════════════════════════════════════════════════════════════════

  async logTimesheet(taskId, projectId, hours, description, date) {
    throw new Error('CustomAdapter: logTimesheet not yet implemented. Replace with your REST call to POST /api/timesheets');
  }

  async getTaskTimesheets(taskId) {
    throw new Error('CustomAdapter: getTaskTimesheets not yet implemented. Replace with your REST call to GET /api/tasks/:taskId/timesheets');
  }

}

export default CustomAdapter;
