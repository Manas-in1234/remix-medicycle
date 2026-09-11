import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, LanguageCode } from '../types';
import { auth, googleProvider, handleFirestoreError, OperationType, db, sanitizeForFirestore, firebaseConfig } from '../lib/firebase';
import {
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useLanguage } from './LanguageContext';

export type AuthErrorKind = 'popup-blocked' | 'cancelled' | 'error' | null;

export function mapFirebaseAuthError(err: any): string {
  console.error('Authentication error:', err?.code, err?.message, err);
  const code = err?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect username/email or password.';
    case 'auth/user-not-found':
      return 'No account was found with this email or username.';
    case 'auth/user-disabled':
      return 'This user account has been disabled by an administrator.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later or reset your password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups or open in a new tab.';
    case 'auth/unauthorized-domain': {
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      return `This website domain (${currentDomain}) is not authorized for Google sign-in. In the Firebase Console, go to Authentication → Settings → Authorized domains and add "${currentDomain}".`;
    }
    case 'auth/operation-not-allowed':
      return 'This authentication method is not enabled in Firebase. Enable it under Authentication → Sign-in method in the Firebase Console.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Please sign in using your existing method.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/invalid-api-key':
      return 'Firebase configuration is incomplete or invalid (invalid API key).';
    default:
      return err?.message ? `Authentication error: ${err.message}` : 'Unable to sign in. Please try again.';
  }
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isSigningIn: boolean;
  authError: string | null;
  authErrorKind: AuthErrorKind;
  clearAuthError: () => void;
  setAuthErrorMessage: (message: string) => void;
  loginWithGoogle: () => Promise<boolean>;
  signupWithEmail: (
    name: string,
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithUsernameOrEmail: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  saveUserLanguage: (language: LanguageCode) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  HOSPITAL: {
    uid: 'usr-hospital-01',
    name: 'Sister Mary (Nurse In-Charge)',
    email: 'mary.nurse@aayushhealthcare.com',
    phone: '+91 866 245 0000',
    role: 'HOSPITAL',
    organizationId: 'hosp-01',
    organizationName: 'Aayush NRI LEPL Health Care',
    organizationType: 'HOSPITAL',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    lastLoginAt: '2026-09-10T10:00:00Z',
  },
  DRIVER: {
    uid: 'drv-01',
    name: 'Rajesh Kumar',
    email: 'rajesh.driver@medicycle-demo.in',
    phone: '+91 98480 12042',
    role: 'DRIVER',
    organizationId: 'org-fleet-01',
    organizationName: 'Bio-Logistics Transit Fleet #1',
    organizationType: 'LOGISTICS',
    status: 'ACTIVE',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    lastLoginAt: '2026-09-10T10:00:00Z',
  },
  PLANT: {
    uid: 'usr-plant-01',
    name: 'M. Suresh Varma (Chief Plant Operator)',
    email: 'suresh.operator@apbmw-kondapalli.in',
    phone: '+91 866 287 4300',
    role: 'PLANT',
    organizationId: 'plant-01',
    organizationName: 'AP State Common Treatment Facility (Kondapalli)',
    organizationType: 'TREATMENT_PLANT',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    lastLoginAt: '2026-09-10T10:00:00Z',
  },
  ADMIN: {
    uid: 'usr-admin-01',
    name: 'Central Health & Environmental Officer',
    email: 'suman.puchala2006@gmail.com',
    phone: '+91 866 250 9999',
    role: 'ADMIN',
    organizationId: 'org-admin-cpcb',
    organizationName: 'Andhra Pradesh Pollution Control Board (BMW Cell)',
    organizationType: 'GOVERNMENT',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    lastLoginAt: '2026-09-10T10:00:00Z',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setLanguage } = useLanguage();
  // Production auth state: initialized to null until an authenticated session is resolved
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorKind, setAuthErrorKind] = useState<AuthErrorKind>(null);

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorKind(null);
  };

  const setAuthErrorMessage = (message: string) => {
    setAuthError(message);
    setAuthErrorKind('error');
  };

  /**
   * Register a new user with Email + Password, saving metadata and username uniqueness mapping to Firestore.
   */
  const signupWithEmail = async (
    name: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSigningIn(true);
    clearAuthError();

    // 1. Validation
    const trimmedName = name.trim();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      const msg = 'Please enter your name (minimum 2 characters).';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    if (!normalizedUsername || normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      const msg = 'Username must be between 3 and 30 characters.';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      const msg = 'Username can only contain letters, numbers, and underscores.';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const msg = 'Please enter a valid email address.';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    if (!password || password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    try {
      // 2. Check username uniqueness in Firestore 'usernames/{normalizedUsername}'
      try {
        const usernameDocRef = doc(db, 'usernames', normalizedUsername);
        const usernameSnap = await getDoc(usernameDocRef);
        if (usernameSnap.exists()) {
          const msg = 'That username is already taken.';
          setAuthError(msg);
          setAuthErrorKind('error');
          return { success: false, error: msg };
        }
      } catch (checkErr) {
        console.warn('Username uniqueness check Firestore note:', checkErr);
      }

      // 3. Create Firebase Authentication user
      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCred.user;

      // Update Firebase auth display name
      try {
        await updateFirebaseProfile(user, { displayName: trimmedName });
      } catch (profileUpdateErr) {
        console.warn('Could not update Firebase displayName:', profileUpdateErr);
      }

      // 4. Determine safe role: public signups are ALWAYS HOSPITAL (safe default)
      // Only predetermined system admin emails receive ADMIN role
      const isAdminEmail =
        normalizedEmail === 'kasettynani@gmail.com' ||
        normalizedEmail === 'yogeeshwar.25bce8660@vitapstudent.ac.in' ||
        normalizedEmail === 'suman.puchala2006@gmail.com';

      const newProfile: UserProfile = {
        uid: user.uid,
        name: trimmedName,
        username: normalizedUsername,
        email: normalizedEmail,
        role: isAdminEmail ? 'ADMIN' : 'HOSPITAL',
        organizationId: isAdminEmail ? 'org-admin-cpcb' : 'hosp-01',
        organizationName: isAdminEmail
          ? 'Central Pollution Control Board (BMW Cell)'
          : 'Aayush NRI LEPL Health Care',
        organizationType: isAdminEmail ? 'GOVERNMENT' : 'HOSPITAL',
        status: 'ACTIVE',
        // language left undefined to prompt language selection screen
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // 5. Store user profile in Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(newProfile));
      } catch (err) {
        console.warn('Could not save user profile to Firestore:', err);
      }

      // 6. Claim username in Firestore
      try {
        await setDoc(doc(db, 'usernames', normalizedUsername), {
          uid: user.uid,
          username: normalizedUsername,
          email: normalizedEmail,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not claim username in Firestore:', err);
      }

      setCurrentUser(newProfile);
      return { success: true };
    } catch (err: any) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      setAuthErrorKind('error');
      return { success: false, error: msg };
    } finally {
      setIsSigningIn(false);
    }
  };

  /**
   * Log in with Email + Password
   */
  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSigningIn(true);
    clearAuthError();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      const msg = 'Please enter your email address.';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    if (!password) {
      const msg = 'Please enter your password.';
      setAuthError(msg);
      setAuthErrorKind('error');
      setIsSigningIn(false);
      return { success: false, error: msg };
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCred.user;

      // Sync Firestore profile
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          setCurrentUser(profile);
          if (profile.language) {
            setLanguage(profile.language);
          } else {
            const savedLang = localStorage.getItem(`medicycle-user-lang-${user.uid}`);
            if (savedLang) {
              setLanguage(savedLang as LanguageCode);
            }
          }
        }
      } catch (snapErr) {
        console.warn('Firestore profile fetch on login note:', snapErr);
      }

      return { success: true };
    } catch (err: any) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      setAuthErrorKind('error');
      return { success: false, error: msg };
    } finally {
      setIsSigningIn(false);
    }
  };

  /**
   * Log in with either Username + Password or Email + Password
   */
  const loginWithUsernameOrEmail = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      const msg = 'Please enter your username or email.';
      setAuthError(msg);
      setAuthErrorKind('error');
      return { success: false, error: msg };
    }

    if (!password) {
      const msg = 'Please enter your password.';
      setAuthError(msg);
      setAuthErrorKind('error');
      return { success: false, error: msg };
    }

    // Check if user entered an email address
    if (trimmed.includes('@')) {
      return loginWithEmail(trimmed, password);
    }

    // User entered a username: resolve email from Firestore 'usernames/{normalizedUsername}'
    setIsSigningIn(true);
    clearAuthError();

    const normalizedUsername = trimmed.toLowerCase();

    try {
      const mappingSnap = await getDoc(doc(db, 'usernames', normalizedUsername));
      if (mappingSnap.exists()) {
        const data = mappingSnap.data();
        let targetEmail = data?.email;

        // If email not stored on mapping, fetch from users doc
        if (!targetEmail && data?.uid) {
          const userSnap = await getDoc(doc(db, 'users', data.uid));
          if (userSnap.exists()) {
            targetEmail = (userSnap.data() as UserProfile).email;
          }
        }

        if (targetEmail) {
          setIsSigningIn(false);
          return loginWithEmail(targetEmail, password);
        }
      }

      // Prototype demo fallback: if matches demo account and demo password or standard demo login
      const demoMap: Record<string, UserProfile> = {
        hospital01: { ...DEMO_PROFILES.HOSPITAL },
        driver01: { ...DEMO_PROFILES.DRIVER },
        plant01: { ...DEMO_PROFILES.PLANT },
        admin01: { ...DEMO_PROFILES.ADMIN },
      };

      if (demoMap[normalizedUsername]) {
        const targetProfile = demoMap[normalizedUsername];
        let resolvedLang = targetProfile.language;
        if (!resolvedLang) {
          const savedLang = localStorage.getItem(`medicycle-user-lang-${targetProfile.uid}`);
          if (savedLang) {
            resolvedLang = savedLang as LanguageCode;
          }
        }
        const updated = {
          ...targetProfile,
          language: resolvedLang,
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(updated);
        if (resolvedLang) {
          setLanguage(resolvedLang);
        }
        return { success: true };
      }

      const msg = 'No account was found with this username.';
      setAuthError(msg);
      setAuthErrorKind('error');
      return { success: false, error: msg };
    } catch (err: any) {
      const msg = mapFirebaseAuthError(err);
      setAuthError(msg);
      setAuthErrorKind('error');
      return { success: false, error: msg };
    } finally {
      setIsSigningIn(false);
    }
  };

  /**
   * Send Password Reset Email via Firebase Authentication
   */
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const msg = 'Please enter a valid email address.';
      return { success: false, error: msg };
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { success: true };
    } catch (err: any) {
      const msg = mapFirebaseAuthError(err);
      return { success: false, error: msg };
    }
  };

  useEffect(() => {
    // Check if there is any pending redirect result
    getRedirectResult(auth).catch(() => {
      // Benign
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            setCurrentUser(profile);
            if (profile.language) {
              setLanguage(profile.language);
            }
          } else {
            // New user - default to ADMIN if email matches workspace owner, or HOSPITAL
            const isAdminEmail =
              user.email === 'kasettynani@gmail.com' ||
              user.email === 'yogeeshwar.25bce8660@vitapstudent.ac.in' ||
              user.email === 'suman.puchala2006@gmail.com';
            const derivedUsername = (user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`)
              .replace(/[^a-zA-Z0-9_]/g, '')
              .toLowerCase();
            const initialProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || 'Authorized User',
              username: derivedUsername,
              email: user.email || '',
              role: isAdminEmail ? 'ADMIN' : 'HOSPITAL',
              organizationId: isAdminEmail ? 'org-admin-cpcb' : 'hosp-01',
              organizationName: isAdminEmail
                ? 'Central Pollution Control Board (BMW Cell)'
                : 'Aayush NRI LEPL Health Care',
              organizationType: isAdminEmail ? 'GOVERNMENT' : 'HOSPITAL',
              status: 'ACTIVE',
              photoUrl: user.photoURL || undefined,
              // Language is left undefined for first login language selection flow
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, sanitizeForFirestore(initialProfile));
            setCurrentUser(initialProfile);
          }
        } catch (err) {
          console.warn('Could not sync user profile from Firestore, using authenticated session:', err);
          const isAdminEmail =
            user.email === 'kasettynani@gmail.com' ||
            user.email === 'yogeeshwar.25bce8660@vitapstudent.ac.in' ||
            user.email === 'suman.puchala2006@gmail.com';
          setCurrentUser({
            uid: user.uid,
            name: user.displayName || 'Authorized User',
            email: user.email || '',
            role: isAdminEmail ? 'ADMIN' : 'HOSPITAL',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          });
        }
      } else {
        // If not signed in to Firebase and no local username session, stay null
        setCurrentUser((prev) => (prev?.uid.startsWith('usr-') || prev?.uid.startsWith('drv-') ? prev : null));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setLanguage]);

  const loginWithGoogle = async (): Promise<boolean> => {
    if (isSigningIn) {
      console.warn('Sign-in already in progress, skipping duplicate invocation.');
      return false;
    }

    setIsSigningIn(true);
    clearAuthError();

    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Profile synchronization
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          setCurrentUser(profile);
          if (profile.language) {
            setLanguage(profile.language);
          } else {
            const savedLang = localStorage.getItem(`medicycle-user-lang-${user.uid}`);
            if (savedLang) {
              profile.language = savedLang as LanguageCode;
              setLanguage(savedLang as LanguageCode);
            }
          }
        } else {
          // New authenticated Google user
          const isAdminEmail =
            user.email === 'kasettynani@gmail.com' ||
            user.email === 'yogeeshwar.25bce8660@vitapstudent.ac.in' ||
            user.email === 'suman.puchala2006@gmail.com';

          const derivedUsername = (user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`)
            .replace(/[^a-zA-Z0-9_]/g, '')
            .toLowerCase();

          const newProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || 'Authorized User',
            username: derivedUsername,
            email: user.email || '',
            role: isAdminEmail ? 'ADMIN' : 'HOSPITAL',
            organizationId: isAdminEmail ? 'org-admin-cpcb' : 'hosp-01',
            organizationName: isAdminEmail
              ? 'Central Pollution Control Board (BMW Cell)'
              : 'Aayush NRI LEPL Health Care',
            organizationType: isAdminEmail ? 'GOVERNMENT' : 'HOSPITAL',
            status: 'ACTIVE',
            photoUrl: user.photoURL || undefined,
            // language is left undefined so language selection is prompted
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          try {
            await setDoc(userDocRef, sanitizeForFirestore(newProfile));
            if (derivedUsername) {
              await setDoc(
                doc(db, 'usernames', derivedUsername),
                {
                  uid: user.uid,
                  username: derivedUsername,
                  email: user.email || '',
                  createdAt: new Date().toISOString(),
                },
                { merge: true }
              );
            }
          } catch (writeErr) {
            console.warn('Could not persist new user profile to Firestore (rules or network):', writeErr);
          }
          setCurrentUser(newProfile);
        }
      } catch (profileErr: any) {
        console.error('Firestore user profile error:', profileErr);
        const isAdminEmail =
          user.email === 'kasettynani@gmail.com' ||
          user.email === 'yogeeshwar.25bce8660@vitapstudent.ac.in' ||
          user.email === 'suman.puchala2006@gmail.com';

        setCurrentUser({
          uid: user.uid,
          name: user.displayName || 'Authorized User',
          email: user.email || '',
          role: isAdminEmail ? 'ADMIN' : 'HOSPITAL',
          status: 'ACTIVE',
          photoUrl: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      }

      return true;
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || '';

      // User-requested exact console error log
      console.error(
        'Google Sign-In Error:',
        code,
        message
      );
      console.error('Firebase Auth Config in use:', {
        errorCode: code,
        errorMessage: message,
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        currentHostname: typeof window !== 'undefined' ? window.location.hostname : '',
      });

      if (code === 'auth/popup-blocked') {
        setAuthErrorKind('popup-blocked');
        setAuthError(
          'Google sign-in popup was blocked by your browser. Please allow popups or open the application in a new tab.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthErrorKind('cancelled');
        setAuthError('Sign-in cancelled. The popup was closed before completing authentication.');
      } else if (code === 'auth/cancelled-popup-request') {
        setAuthErrorKind('cancelled');
        setAuthError('Sign-in was cancelled by another request.');
      } else if (code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setAuthErrorKind('error');
        setAuthError(
          `[auth/unauthorized-domain] Google sign-in is not authorized for domain "${currentDomain}" on active Firebase project "${firebaseConfig.projectId}" (${firebaseConfig.authDomain}).`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setAuthErrorKind('error');
        setAuthError(
          `[auth/operation-not-allowed] Google sign-in is not enabled for project "${firebaseConfig.projectId}". Enable it in Firebase Console → Authentication → Sign-in method.`
        );
      } else if (code === 'auth/invalid-api-key') {
        setAuthErrorKind('error');
        setAuthError(`[auth/invalid-api-key] The Firebase API key configured for project "${firebaseConfig.projectId}" is invalid.`);
      } else if (code === 'auth/network-request-failed') {
        setAuthErrorKind('error');
        setAuthError('Network connection failed. Please check your internet connection and try again.');
      } else if (code === 'auth/account-exists-with-different-credential') {
        setAuthErrorKind('error');
        setAuthError('An account already exists with the same email address using a different sign-in method.');
      } else if (code === 'auth/user-disabled') {
        setAuthErrorKind('error');
        setAuthError('This user account has been disabled by an administrator.');
      } else {
        setAuthErrorKind('error');
        setAuthError(code ? `[${code}] ${message || 'Authentication failed'}` : (message || 'Unable to sign in. Please try again.'));
      }
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  /**
   * Username-only prototype/demo authentication method.
   * Resolves username -> usernames/{username} -> users/{uid}
   */
  const loginWithUsername = async (
    rawUsername: string
  ): Promise<{ success: boolean; error?: string }> => {
    const username = rawUsername.trim().toLowerCase();
    if (!username) {
      return { success: false, error: 'Please enter a username.' };
    }

    setIsSigningIn(true);
    clearAuthError();

    try {
      let targetProfile: UserProfile | null = null;

      // 1. Try reading from Firestore 'usernames/{username}'
      try {
        const usernameDocRef = doc(db, 'usernames', username);
        const usernameSnap = await getDoc(usernameDocRef);
        if (usernameSnap.exists()) {
          const mapping = usernameSnap.data();
          if (mapping?.uid) {
            const userDocRef = doc(db, 'users', mapping.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              targetProfile = userSnap.data() as UserProfile;
            }
          }
        }
      } catch (err) {
        console.warn('Firestore username lookup note:', err);
      }

      // 2. Prototype / Demo fallback resolution
      if (!targetProfile) {
        const demoMap: Record<string, UserProfile> = {
          hospital01: { ...DEMO_PROFILES.HOSPITAL },
          driver01: { ...DEMO_PROFILES.DRIVER },
          plant01: { ...DEMO_PROFILES.PLANT },
          admin01: { ...DEMO_PROFILES.ADMIN },
        };

        if (demoMap[username]) {
          targetProfile = { ...demoMap[username] };
          // Attempt to sync mapping document to Firestore for permanent resolution
          try {
            await setDoc(
              doc(db, 'usernames', username),
              {
                uid: targetProfile.uid,
                username,
                role: targetProfile.role,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            await setDoc(doc(db, 'users', targetProfile.uid), sanitizeForFirestore(targetProfile), {
              merge: true,
            });
          } catch {
            // Ignore if rules disallow unauthenticated write
          }
        }
      }

      if (targetProfile) {
        // Restore language from profile or localStorage
        let resolvedLang: LanguageCode | undefined = targetProfile.language;
        if (!resolvedLang) {
          const savedLang = localStorage.getItem(`medicycle-user-lang-${targetProfile.uid}`);
          if (savedLang) {
            resolvedLang = savedLang as LanguageCode;
          }
        }

        const updated = {
          ...targetProfile,
          language: resolvedLang,
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(updated);
        if (resolvedLang) {
          setLanguage(resolvedLang);
        }
        return { success: true };
      }

      return {
        success: false,
        error: 'Username not found. Try hospital01, driver01, plant01, or admin01.',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to sign in. Please try again.' };
    } finally {
      setIsSigningIn(false);
    }
  };

  const saveUserLanguage = async (newLang: LanguageCode) => {
    setLanguage(newLang);
    if (!currentUser) return;

    const updated: UserProfile = {
      ...currentUser,
      language: newLang,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);

    try {
      localStorage.setItem(`medicycle-user-lang-${currentUser.uid}`, newLang);
      localStorage.setItem('medicycle-language', newLang);
    } catch {
      // ignore
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userDocRef,
        sanitizeForFirestore({
          language: newLang,
          updatedAt: updated.updatedAt,
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not persist language to Firestore:', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      clearAuthError();
    }
  };

  const switchDemoRole = (role: UserRole) => {
    setCurrentUser(DEMO_PROFILES[role]);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);

    if (firebaseUser || currentUser.uid) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeForFirestore(updated), { merge: true });
      } catch (err) {
        console.warn('Firestore updateProfile note:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isSigningIn,
        authError,
        authErrorKind,
        clearAuthError,
        setAuthErrorMessage,
        loginWithGoogle,
        signupWithEmail,
        loginWithEmail,
        loginWithUsernameOrEmail,
        loginWithUsername,
        resetPassword,
        saveUserLanguage,
        logout,
        switchDemoRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

