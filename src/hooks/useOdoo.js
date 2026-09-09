import { useSelector } from 'react-redux';

export const useOdoo = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  return { user, isAuthenticated };
};
