import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const USERS_COLLECTION = "users";
const TASKS_SUBCOLLECTION = "tasks";
const SETTINGS_SUBCOLLECTION = "settings";
const SETTINGS_DOC_ID = "app";

const LEGACY_TASKS_COLLECTION = "tasks";
const LEGACY_SETTINGS_COLLECTION = "settings";

const userDocRef = (uid) => doc(db, USERS_COLLECTION, uid);
const userTasksCollection = (uid) =>
  collection(db, USERS_COLLECTION, uid, TASKS_SUBCOLLECTION);
const userSettingsDocRef = (uid) =>
  doc(db, USERS_COLLECTION, uid, SETTINGS_SUBCOLLECTION, SETTINGS_DOC_ID);

/** @internal Legacy reads — only call from migrateSharedDataToUser(). */
const readLegacyTasksForMigration = async () => {
  const snapshot = await getDocs(collection(db, LEGACY_TASKS_COLLECTION));
  return snapshot.docs.map(normalizeTaskDoc);
};

/** @internal Legacy reads — only call from migrateSharedDataToUser(). */
const readLegacySettingsForMigration = async () => {
  const snap = await getDoc(doc(db, LEGACY_SETTINGS_COLLECTION, SETTINGS_DOC_ID));
  return snap.exists() ? snap.data() : {};
};

const normalizeTaskDoc = (docSnap) => {
  const data = docSnap.data();
  return {
    ...data,
    id: data.id ?? (Number(docSnap.id) || docSnap.id),
    type: data.type || "task",
    title: data.title || data.task,
  };
};

export async function ensureUserExists(uid) {
  if (!uid) return;

  try {
    const ref = userDocRef(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { createdAt: new Date().toISOString() });
    }
  } catch (error) {
    console.error("Failed to ensure user document exists in Firestore:", error);
  }
}

export async function migrateSharedDataToUser(uid) {
  if (!uid) return;

  try {
    const settings = await fetchSettings(uid);
    if (settings.sharedDataMigrated) return;

    const userTasksSnapshot = await getDocs(userTasksCollection(uid));
    if (!userTasksSnapshot.empty) {
      await saveSettings(uid, { sharedDataMigrated: true });
      return;
    }

    const legacyTasks = await readLegacyTasksForMigration();
    if (legacyTasks.length === 0) {
      await saveSettings(uid, { sharedDataMigrated: true });
      return;
    }

    for (const task of legacyTasks) {
      await setDoc(
        doc(db, USERS_COLLECTION, uid, TASKS_SUBCOLLECTION, String(task.id)),
        task
      );
    }

    const sharedSettings = await readLegacySettingsForMigration();
    const { sharedDataMigrated: _ignored, ...settingsData } = sharedSettings;

    await setDoc(
      userSettingsDocRef(uid),
      { ...settingsData, sharedDataMigrated: true },
      { merge: true }
    );
  } catch (error) {
    console.error("Failed to migrate shared Firestore data to user:", error);
  }
}

export async function fetchTasks(uid) {
  if (!uid) return [];

  try {
    const snapshot = await getDocs(userTasksCollection(uid));
    return snapshot.docs.map(normalizeTaskDoc);
  } catch (error) {
    console.error("Failed to fetch tasks from Firestore:", error);
    return [];
  }
}

export function subscribeToTasks(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    userTasksCollection(uid),
    (snapshot) => {
      const tasks = snapshot.docs.map(normalizeTaskDoc);
      callback(tasks);
    },
    (error) => {
      console.error("Failed to subscribe to tasks in Firestore:", error);
      callback([]);
    }
  );
}

export async function createTask(uid, task) {
  if (!uid) return;

  try {
    await setDoc(
      doc(db, USERS_COLLECTION, uid, TASKS_SUBCOLLECTION, String(task.id)),
      task
    );
  } catch (error) {
    console.error("Failed to create task in Firestore:", error);
  }
}

export async function updateTask(uid, id, updates) {
  if (!uid) return;

  try {
    await updateDoc(
      doc(db, USERS_COLLECTION, uid, TASKS_SUBCOLLECTION, String(id)),
      updates
    );
  } catch (error) {
    console.error("Failed to update task in Firestore:", error);
  }
}

export async function deleteTask(uid, id) {
  if (!uid) return;

  try {
    await deleteDoc(
      doc(db, USERS_COLLECTION, uid, TASKS_SUBCOLLECTION, String(id))
    );
  } catch (error) {
    console.error("Failed to delete task from Firestore:", error);
  }
}

export async function fetchSettings(uid) {
  if (!uid) return {};

  try {
    const snap = await getDoc(userSettingsDocRef(uid));
    if (snap.exists()) {
      return snap.data();
    }
    return {};
  } catch (error) {
    console.error("Failed to fetch settings from Firestore:", error);
    return {};
  }
}

export async function saveSettings(uid, settings) {
  if (!uid) return;

  try {
    await setDoc(userSettingsDocRef(uid), settings, { merge: true });
  } catch (error) {
    console.error("Failed to save settings to Firestore:", error);
  }
}

export async function migrateFromLocalStorage(uid) {
  if (!uid) return;

  try {
    const savedTasksRaw = localStorage.getItem("tasks");
    if (!savedTasksRaw) return;

    const savedTasks = JSON.parse(savedTasksRaw);
    for (const item of savedTasks) {
      const task = {
        ...item,
        type: item.type || "task",
        title: item.title || item.task,
      };
      await createTask(uid, task);
    }

    await saveSettings(uid, {
      streak: parseInt(localStorage.getItem("streak"), 10) || 0,
      lastCompletionDate: localStorage.getItem("lastCompletionDate") || "",
      taskBreakdowns: JSON.parse(localStorage.getItem("taskBreakdowns") || "{}"),
      rescuePlan: localStorage.getItem("rescuePlan") || "",
    });

    localStorage.removeItem("tasks");
    localStorage.removeItem("streak");
    localStorage.removeItem("lastCompletionDate");
    localStorage.removeItem("taskBreakdowns");
    localStorage.removeItem("rescuePlan");
  } catch (error) {
    console.error("Failed to migrate data from localStorage to Firestore:", error);
  }
}
