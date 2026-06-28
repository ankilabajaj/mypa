import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const USERS_COLLECTION = "users";
const NOTIFICATIONS_SUBCOLLECTION = "notifications";

const userNotificationsCollection = (uid) =>
  collection(db, USERS_COLLECTION, uid, NOTIFICATIONS_SUBCOLLECTION);

const notificationDocRef = (uid, id) =>
  doc(db, USERS_COLLECTION, uid, NOTIFICATIONS_SUBCOLLECTION, id);

export function subscribeToNotifications(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    userNotificationsCollection(uid),
    (snapshot) => {
      const notifications = snapshot.docs
        .map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      callback(notifications);
    },
    (error) => {
      console.error("Failed to subscribe to notifications:", error);
      callback([]);
    }
  );
}

export async function createNotification(uid, notification) {
  if (!uid || !notification.id) return false;

  try {
    const ref = notificationDocRef(uid, notification.id);
    const snap = await getDoc(ref);
    if (snap.exists()) return false;

    await setDoc(ref, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      icon: notification.icon,
      read: false,
      createdAt: notification.createdAt || new Date().toISOString(),
      browserTitle: notification.browserTitle || "",
      browserBody: notification.browserBody || "",
    });
    return true;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return false;
  }
}

export async function markNotificationRead(uid, id) {
  if (!uid || !id) return;

  try {
    await updateDoc(notificationDocRef(uid, id), { read: true });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

export async function clearAllNotifications(uid) {
  if (!uid) return;

  try {
    const snapshot = await getDocs(userNotificationsCollection(uid));
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Failed to clear notifications:", error);
  }
}
