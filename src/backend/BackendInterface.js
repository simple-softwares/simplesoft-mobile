/**
 * BackendInterface — The contract every backend adapter must implement
 *
 * This defines all operations the app needs from a backend.
 * Data shapes are normalised here so the app never knows which backend is active.
 *
 * Naming convention:
 *   - All methods return plain JS objects or arrays — never Odoo tuples like [id, name]
 *   - Adapters are responsible for normalising backend-specific quirks
 *   - Data shapes are consistent across OdooAdapter and CustomAdapter
 */

export class BackendInterface {

  // ══════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ══════════════════════════════════════════════════════════════════

  /**
   * Authenticate with email and password
   * @param {string} email
   * @param {string} password
   * @param {string} db Database name
   * @returns {Promise<{ uid: number, name: string, email: string, partner_id: number, session_id?: string, db: string }>}
   */
  async login(email, password, db) {
    throw new Error('Not implemented');
  }

  /**
   * Logout and clear session
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error('Not implemented');
  }

  /**
   * Authenticate with Google ID token
   * @param {string} idToken
   * @param {string} name
   * @param {string} phone
   * @returns {Promise<{ status: string, data?: object, message?: string }>}
   */
  async loginWithGoogle(idToken, name, phone) {
    throw new Error('Not implemented');
  }

  /**
   * Register a new user account
   * @param {string} name Full name
   * @param {string} email Email address
   * @param {string} password Password
   * @param {string} db Database name
   * @returns {Promise<{ uid: number, name: string, email: string }>}
   */
  async register(name, email, password, db) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get tasks with optional filtering and pagination
   * @param {any[]} domain Odoo-style domain for OdooAdapter; ignored in CustomAdapter
   * @param {object} opts { limit?: number, offset?: number, order?: string, userId?: number }
   * @returns {Promise<Task[]>}
   *
   * Task shape: { id, name, projectId, projectName, stageId, stageName,
   *               priority, deadline, assigneeIds, description, createdAt }
   */
  async getTasks(domain = [], opts = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get tasks assigned to a specific user
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Task[]>}
   */
  async getMyTasks(userId, limit = 100) {
    throw new Error('Not implemented');
  }

  /**
   * Get a single task by ID
   * @param {number} taskId
   * @returns {Promise<Task>}
   */
  async getTask(taskId) {
    throw new Error('Not implemented');
  }

  /**
   * Create a new task
   * @param {object} vals Task data { name, project_id, user_ids, priority, ... }
   * @returns {Promise<number>} Task ID
   */
  async createTask(vals) {
    throw new Error('Not implemented');
  }

  /**
   * Update a task
   * @param {number} taskId
   * @param {object} vals Fields to update
   * @returns {Promise<void>}
   */
  async updateTask(taskId, vals) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a task
   * @param {number} taskId
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // PROJECTS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get projects with optional filtering
   * @param {any[]} domain
   * @param {object} opts { limit?: number, offset?: number }
   * @returns {Promise<Project[]>}
   *
   * Project shape: { id, name, taskCount, ownerId, ownerName, active }
   */
  async getProjects(domain = [], opts = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get task stages/statuses for a project
   * @param {number|null} projectId  null = all stages
   * @returns {Promise<Stage[]>}
   *
   * Stage shape: { id, name, sequence, fold }
   */
  async getStages(projectId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Create a new stage
   * @param {string} name
   * @param {number|null} projectId  If set, link stage to this project
   * @returns {Promise<number>} Stage ID
   */
  async createStage(name, projectId = null) {
    throw new Error('Not implemented');
  }

  /**
   * Update a stage
   * @param {number} stageId
   * @param {object} vals  e.g. { name, fold, sequence }
   * @returns {Promise<void>}
   */
  async updateStage(stageId, vals) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a stage
   * @param {number} stageId
   * @returns {Promise<void>}
   */
  async deleteStage(stageId) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get aggregated dashboard data
   * @param {number} userId
   * @returns {Promise<{ stats: object, tasks: Task[], projects: Project[], contacts: Contact[] }>}
   */
  async getDashboardData(userId) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get contacts with optional filtering and search
   * @param {object} opts { search?: string, type?: string, limit?: number, offset?: number }
   * @returns {Promise<Contact[]>}
   *
   * Contact shape: { id, name, email, phone, jobTitle, isCompany }
   */
  async getContacts(opts = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get a single contact by ID
   * @param {number} contactId
   * @returns {Promise<Contact>}
   */
  async getContact(contactId) {
    throw new Error('Not implemented');
  }

  /**
   * Create a new contact
   * @param {object} vals Contact data
   * @returns {Promise<number>} Contact ID
   */
  async createContact(vals) {
    throw new Error('Not implemented');
  }

  /**
   * Update a contact
   * @param {number} contactId
   * @param {object} vals Fields to update
   * @returns {Promise<void>}
   */
  async updateContact(contactId, vals) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a contact
   * @param {number} contactId
   * @returns {Promise<void>}
   */
  async deleteContact(contactId) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEAM / MEMBERS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get team members
   * @param {boolean} forceRefresh
   * @returns {Promise<Member[]>}
   *
   * Member shape: { id, name, email, phone, avatarUrl, taskCount, initials }
   */
  async getMembers(forceRefresh = false) {
    throw new Error('Not implemented');
  }

  /**
   * Get a single member by ID
   * @param {number} userId
   * @returns {Promise<Member>}
   */
  async getMember(userId) {
    throw new Error('Not implemented');
  }

  /**
   * Get all teams
   * @returns {Promise<Team[]>}
   *
   * Team shape: { id, name, description, color, memberCount }
   */
  async getTeams() {
    throw new Error('Not implemented');
  }

  /**
   * Create a new team
   * @param {object} vals { name, description?, color? }
   * @returns {Promise<Team>}
   */
  async createTeam(vals) {
    throw new Error('Not implemented');
  }

  /**
   * Update a team
   * @param {number} teamId
   * @param {object} vals Fields to update
   * @returns {Promise<void>}
   */
  async updateTeam(teamId, vals) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a team
   * @param {number} teamId
   * @returns {Promise<void>}
   */
  async deleteTeam(teamId) {
    throw new Error('Not implemented');
  }

  /**
   * Add a member to a team
   * @param {number} teamId
   * @param {number} userId
   * @param {string} role
   * @returns {Promise<void>}
   */
  async addMember(teamId, userId, role = 'member') {
    throw new Error('Not implemented');
  }

  /**
   * Remove a member from a team
   * @param {number} teamId
   * @param {number} memberId
   * @returns {Promise<void>}
   */
  async removeMember(teamId, memberId) {
    throw new Error('Not implemented');
  }

  /**
   * Update a member's role in a team
   * @param {number} teamId
   * @param {number} memberId
   * @param {string} role
   * @returns {Promise<void>}
   */
  async updateMemberRole(teamId, memberId, role) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get user profile
   * @param {number} uid User ID
   * @returns {Promise<User>}
   */
  async getProfile(uid) {
    throw new Error('Not implemented');
  }

  /**
   * Update user profile
   * @param {number} uid
   * @param {object} vals { name?, phone?, ... }
   * @returns {Promise<void>}
   */
  async updateProfile(uid, vals) {
    throw new Error('Not implemented');
  }

  /**
   * Upload user avatar/photo
   * @param {number} uid
   * @param {string} base64Image Base64-encoded image data
   * @returns {Promise<void>}
   */
  async uploadPhoto(uid, base64Image) {
    throw new Error('Not implemented');
  }

  /**
   * Change user password
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async changePassword(currentPassword, newPassword) {
    throw new Error('Not implemented');
  }

  // ══════════════════════════════════════════════════════════════════
  // TIMESHEETS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Log time spent on a task
   * @param {number} taskId
   * @param {number} projectId
   * @param {number} hours Decimal hours (e.g., 1.5 for 1h 30m)
   * @param {string} description
   * @param {string} date ISO date string
   * @returns {Promise<number>} Timesheet line ID
   */
  async logTimesheet(taskId, projectId, hours, description, date) {
    throw new Error('Not implemented');
  }

  /**
   * Get timesheets for a task
   * @param {number} taskId
   * @returns {Promise<Timesheet[]>}
   *
   * Timesheet shape: { id, date, hours, userId, userName, description }
   */
  async getTaskTimesheets(taskId) {
    throw new Error('Not implemented');
  }

}
