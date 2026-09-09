/**
 * BackendService — now points to the new FastAPI REST backend.
 * RestAdapter replaces OdooAdapter — same method signatures, no Odoo dependency.
 */

import RestAdapter from './RestAdapter';

export default RestAdapter;
