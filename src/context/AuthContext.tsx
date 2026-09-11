import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { auth, googleProvider, handleFirestoreError, OperationType, db, sanitizeForFirestore } from '../lib/firebase';
import { signInWithPopup, getRedirectResult, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type AuthErrorKind = 'popup-blocked' | 'cancelled' | 'error' | null;

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isSigningIn: boolean;
  authError: string | null;
  authErrorKind: AuthErrorKind;
  clearAuthError: () => void;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const DEMO_PROFILES: Record<UserRole, UserProfile> = {
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(DEMO_PROFILES.HOSPITAL);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorKind, setAuthErrorKind] = useState<AuthErrorKind>(null);

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorKind(null);
  };

  useEffect(() => {
    // Check if there is any pending redirect result (if opened in standalone tab)
    getRedirectResult(auth).catch(() => {
      // Benign if no redirect was pending
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setCurrentUser(snap.data() as UserProfile);
          } else {
            // New user - default to ADMIN if email matches workspace owner, or HOSPITAL
            const isAdminEmail =
              user.email === 'yogeeshwar.25bce8660@vitapstudent.ac.in' ||
              user.email === 'suman.puchala2006@gmail.com';
            const initialProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || 'Authorized User',
              email: user.email || '',
              role: isAdminEmail ? 'ADMIN' : 'HOSPITAL',
              organizationId: isAdminEmail ? 'org-admin-cpcb' : 'hosp-01',
              organizationName: isAdminEmail
                ? 'Central Pollution Control Board (BMW Cell)'
                : 'Aayush NRI LEPL Health Care',
              organizationType: isAdminEmail ? 'GOVERNMENT' : 'HOSPITAL',
              status: 'ACTIVE',
              photoUrl: user.photoURL || undefined,
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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    if (isSigningIn) {
      console.warn('Sign-in already in progress, skipping duplicate invocation.');
      return false;
    }

    setIsSigningIn(true);
    clearAuthError();

    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/popup-blocked') {
        console.warn('Google sign-in popup was blocked by browser / iframe sandbox restrictions.');
        setAuthErrorKind('popup-blocked');
        setAuthError(
          'Your browser blocked the Google Sign-in popup because the app is running in an embedded preview frame. Open the app in a new tab or allow popups in your browser toolbar to connect your account.'
        );
      } else if (code === 'auth/cancelled-popup-request') {
        console.warn('Google sign-in popup request cancelled or superseded.');
        setAuthErrorKind('cancelled');
      } else if (code === 'auth/popup-closed-by-user') {
        console.warn('Google sign-in popup was closed by the user.');
        setAuthErrorKind('cancelled');
      } else {
        console.warn('Google sign-in encountered an issue:', code, message);
        setAuthErrorKind('error');
        setAuthError(message || 'Unable to sign in with Google. Please try again or open the app in a new tab.');
      }
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Revert to Hospital demo for instant usability
      setCurrentUser(DEMO_PROFILES.HOSPITAL);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const switchDemoRole = (role: UserRole) => {
    setCurrentUser(DEMO_PROFILES[role]);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeForFirestore(updated), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
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
        loginWithGoogle,
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
