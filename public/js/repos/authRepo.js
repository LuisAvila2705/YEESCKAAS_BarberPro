import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { auth, db } from "../firebase/firebase.js";

export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}

export function listenAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserRole(uid) {
  if (!uid) return null;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.active === false) return null;

  return data.role || null;
}

export async function getCurrentAdminSession() {
  const user = auth.currentUser;
  if (!user) return null;

  const role = await getUserRole(user.uid);
  if (role !== "admin") return null;

  return {
    uid: user.uid,
    email: user.email,
    role,
  };
}