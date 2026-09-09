import Invoices       from './invoices';
import Expenses       from './expenses';
import Service        from './service';
import Payroll        from './payroll';
import Helpdesk       from './helpdesk';
import CRM            from './crm';
import Sales          from './sales';
import Attendance     from './attendance';
import Leave          from './leave';
import HR             from './hr';
import Inventory      from './inventory';
import Performance    from './performance';
import Automation     from './automation';
import FoundersRadar  from './founders-radar';
import Calendar       from './calendar';
import Chat           from './chat';
import Files          from './files';
import Telecaller     from './telecaller';

// MODULE_REGISTRY — add a new module here and everywhere else just works.
// Priority order = bottom nav slot priority (first 2 installed modules get bottom nav slots)
// NOTE: HR module now includes Teams, Employees, Departments, Leaves
export const MODULE_REGISTRY = [
  Invoices,     // GST Invoicing + Quotations — first priority for billing-focused workspaces
  Expenses,     // Employee reimbursements + vendor bills with receipt camera capture
  Service,      // Service tickets — GPS clock-in/out + site photos + work logs
  Payroll,      // Payroll runs + payslip PDF download
  Helpdesk,     // Support tickets — comment thread, status workflow, internal notes
  CRM,
  Sales,
  Attendance,
  Leave,
  HR,
  Inventory,
  Performance,
  Automation,
  FoundersRadar,
  Calendar,
  Chat,
  Files,
  Telecaller,   // Telecaller dashboard, call log, and leaderboard (demo data)
];

// Lookup by key
export const getModule = (key) => MODULE_REGISTRY.find(m => m.key === key);
