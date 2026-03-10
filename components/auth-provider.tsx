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
import { upsertUserOnLogin, getUser } from "@/lib/firebase/firestore";
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

// TODO: 구글 로그인 인증 복구 후 임시 유저 제거하고 원래 로직 복원
const TEMP_MOCK_USER = {
  uid: "iLuP5PoNCTdgihjou4QbESZHb0b2",
  email: "sksmsdirjsdnl@gmail.com",
  displayName: "문이열리네요그대가들어오죠",
  photoURL: "https://lh3.googleusercontent.com/a/ACg8ocL6ntv6KyLPGsndK5JmFzCqKVdrKTJVLZtPFxUI2tonhMv-VLc=s96-c",
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(TEMP_MOCK_USER);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getUser(user.uid).then((u) => {
        if (u) setAppUser(u);
      }).catch(console.error);
    }
  }, [user]);

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

  const signInWithGoogle = useCallback(async () => {
    // 임시: mock 유저 사용
    setUser(TEMP_MOCK_USER);
    setLoading(false);
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
    // 임시: mock 유저이므로 state만 초기화
    setUser(null);
    setAppUser(null);
    setIdToken(null);
    window.location.href = "/login";
    // await firebaseSignOut(auth);
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
