"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { auth } from "@/lib/firebase/config";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { upsertUserOnLogin, getUser, getUserByEmail } from "@/lib/firebase/firestore";
import type { AppUser } from "@/lib/types";

const AUTO_LOGIN_KEY = "temp_auth_uid";
const AUTO_LOGIN_EXPIRY_KEY = "temp_auth_expiry";
const AUTO_LOGIN_DURATION_DAYS = 30;

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, autoLogin: boolean) => Promise<AppUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => { throw new Error("not ready"); },
  signOut: async () => {},
});

const googleProvider = new GoogleAuthProvider();

// TODO: 구글 로그인 인증 복구 후 임시 이메일 로그인 제거하고 원래 로직 복원

function getSavedAuth(): string | null {
  try {
    const uid = localStorage.getItem(AUTO_LOGIN_KEY);
    const expiry = localStorage.getItem(AUTO_LOGIN_EXPIRY_KEY);
    if (!uid) {
      const sessionUid = sessionStorage.getItem(AUTO_LOGIN_KEY);
      return sessionUid;
    }
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(AUTO_LOGIN_KEY);
      localStorage.removeItem(AUTO_LOGIN_EXPIRY_KEY);
      return null;
    }
    return uid;
  } catch {
    return null;
  }
}

function saveAuth(uid: string, autoLogin: boolean) {
  try {
    if (autoLogin) {
      localStorage.setItem(AUTO_LOGIN_KEY, uid);
      localStorage.setItem(
        AUTO_LOGIN_EXPIRY_KEY,
        String(Date.now() + AUTO_LOGIN_DURATION_DAYS * 24 * 60 * 60 * 1000)
      );
      sessionStorage.removeItem(AUTO_LOGIN_KEY);
    } else {
      sessionStorage.setItem(AUTO_LOGIN_KEY, uid);
      localStorage.removeItem(AUTO_LOGIN_KEY);
      localStorage.removeItem(AUTO_LOGIN_EXPIRY_KEY);
    }
  } catch {
    // ignore
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(AUTO_LOGIN_KEY);
    localStorage.removeItem(AUTO_LOGIN_EXPIRY_KEY);
    sessionStorage.removeItem(AUTO_LOGIN_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUid = getSavedAuth();
    if (savedUid) {
      getUser(savedUid).then((u) => {
        if (u && u.is_active !== false) {
          const mockUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.display_name,
            photoURL: u.photo_url,
          } as unknown as User;
          setUser(mockUser);
          setAppUser(u);
        } else {
          clearAuth();
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // TODO: 구글 로그인 인증 복구 후 아래 주석 해제
  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
  //     setUser(firebaseUser);
  //     if (!firebaseUser) {
  //       setAppUser(null);
  //       setIdToken(null);
  //     }
  //     setLoading(false);
  //   });
  //   return () => unsubscribe();
  // }, []);

  // useEffect(() => {
  //   const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
  //     if (firebaseUser) {
  //       const token = await firebaseUser.getIdToken();
  //       setIdToken(token);
  //     } else {
  //       setIdToken(null);
  //     }
  //   });
  //   return () => unsubscribe();
  // }, []);

  // useEffect(() => {
  //   if (!idToken) return;
  //   const interval = setInterval(async () => {
  //     const currentUser = auth.currentUser;
  //     if (currentUser) {
  //       const token = await currentUser.getIdToken(true);
  //       setIdToken(token);
  //     }
  //   }, 30 * 60 * 1000);
  //   return () => clearInterval(interval);
  // }, [idToken]);

  const signInWithEmail = useCallback(async (email: string, autoLogin: boolean): Promise<AppUser> => {
    const foundUser = await getUserByEmail(email.trim().toLowerCase());
    if (!foundUser) {
      throw new Error("등록되지 않은 이메일입니다.");
    }
    if (foundUser.is_active === false) {
      throw new Error("비활성화된 계정입니다. 관리자에게 문의하세요.");
    }
    const mockUser = {
      uid: foundUser.uid,
      email: foundUser.email,
      displayName: foundUser.display_name,
      photoURL: foundUser.photo_url,
    } as unknown as User;
    setUser(mockUser);
    setAppUser(foundUser);
    saveAuth(foundUser.uid, autoLogin);
    return foundUser;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // TODO: 구글 로그인 인증 복구 후 아래 주석 해제
    // try {
    //   const result = await signInWithPopup(auth, googleProvider);
    //   const firebaseUser = result.user;
    //   const userData = await upsertUserOnLogin({
    //     uid: firebaseUser.uid,
    //     email: firebaseUser.email,
    //     displayName: firebaseUser.displayName,
    //     photoURL: firebaseUser.photoURL,
    //   });
    //   setAppUser(userData);
    //   const token = await firebaseUser.getIdToken();
    //   setIdToken(token);
    // } catch (error: unknown) {
    //   console.error("Google sign-in failed:", error);
    //   throw error;
    // }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setAppUser(null);
    setIdToken(null);
    clearAuth();
    window.location.href = "/login";
    // TODO: 구글 로그인 인증 복구 후 아래 주석 해제
    // await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, idToken, loading, signInWithGoogle, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
