"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { auth } from "@/lib/firebase/config";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { upsertUserOnLogin } from "@/lib/firebase/firestore";
import type { AppUser } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setAppUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!idToken) return;
    const interval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken(true);
        setIdToken(token);
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [idToken]);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const firebaseUser = result.user;
          const userData = await upsertUserOnLogin({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
          setAppUser(userData);
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
        }
      })
      .catch((error) => {
        console.error("Redirect sign-in error:", error);
      });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: unknown) {
      console.error("Google sign-in failed:", error);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setAppUser(null);
    setIdToken(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, idToken, loading, signInWithGoogle, signOut }}>
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
