import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { authStorage as storage } from '../storage/storageRegistry';
import { getBaseUrl, GOOGLE_WEB_CLIENT_ID } from '../../config';
import SessionService from './sessionService';

let configured = false;

export const configureGoogle = () => {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
  configured = true;
};

export const getGoogleIdToken = async () => {
  configureGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();
  return {
    idToken:  userInfo.idToken  || userInfo.data?.idToken,
    email:    userInfo.user?.email  || userInfo.data?.user?.email,
    name:     userInfo.user?.name   || userInfo.data?.user?.name,
    photo:    userInfo.user?.photo  || userInfo.data?.user?.photo,
  };
};

/**
 * Call /api/auth/google
 * Returns:
 *   { status: 'success',         data: session }
 *   { status: 'signup_required', email, google_name }
 *   { status: 'error',           message }
 */
export const callGoogleAuth = async (idToken, name = '', phone = '') => {
  const cookie = SessionService.getCookie();
  const res = await axios.post(`${getBaseUrl()}/api/auth/google`,
    { id_token: idToken, name, phone },
    { headers: { 'Content-Type': 'application/json', Cookie: cookie }, timeout: 15000 }
  );
  // Save cookie if returned
  const setCookie = res.headers['set-cookie'];
  if (setCookie?.length) SessionService.saveCookie(setCookie);
  return res.data;
};

export const signOutGoogle = async () => {
  try { await GoogleSignin.signOut(); } catch {}
};
