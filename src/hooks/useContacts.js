/**
 * useContacts — Data-fetching hook for contacts
 *
 * Usage:
 *   const { contacts, loading, error, refreshing, refresh } = useContacts();
 *   const { contacts, loading } = useContacts({ search: 'john', limit: 50 });
 */

import { useCallback } from 'react';
import useQuery from './useQuery';
import ContactsService from '../services/contacts/contactsService';

/**
 * Fetch contacts with optional filtering
 * @param {object} opts { search?, type?, limit?, forceRefresh? }
 * @returns {object} { contacts, loading, error, refreshing, refresh, reload }
 */
export const useContacts = (opts = {}) => {
  const fetchFn = useCallback(async () => {
    return ContactsService.list({
      search: opts.search || '',
      type: opts.type || 'all',
      limit: opts.limit || 80,
    });
  }, [opts.search, opts.type, opts.limit]);

  const { data, ...rest } = useQuery(
    `contacts-${opts.search || 'all'}`,
    fetchFn,
    [opts.search, opts.type, opts.limit],
    { initialData: [] }
  );

  return {
    contacts: data,
    ...rest,
  };
};

export default useContacts;
