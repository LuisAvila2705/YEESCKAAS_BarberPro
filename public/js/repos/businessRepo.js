import { db } from "../firebase/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function getBusinessInfo() {
  const snap = await getDoc(doc(db, "settings", "business"));
  if (!snap.exists()) throw new Error("No existe settings/business");
  return snap.data();
}