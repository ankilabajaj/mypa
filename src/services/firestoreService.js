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

const TASKS_COLLECTION = "tasks";
const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOC_ID = "app";

const normalizeTaskDoc = (docSnap) => {
  const data = docSnap.data();
  return {
    ...data,
    id: data.id ?? (Number(docSnap.id) || docSnap.id),
    type: data.type || "task",
    title: data.title || data.task,
  };
};

export async function fetchTasks() {
  try {
    const snapshot = await getDocs(collection(db, TASKS_COLLECTION));
    return snapshot.docs.map(normalizeTaskDoc);
  } catch (error) {
    console.error("Failed to fetch tasks from Firestore:", error);
    return [];
  }
}

export function subscribeToTasks(callback) {
  return onSnapshot(
    collection(db, TASKS_COLLECTION),
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

export async function createTask(task) {
  try {
    await setDoc(doc(db, TASKS_COLLECTION, String(task.id)), task);
  } catch (error) {
    console.error("Failed to create task in Firestore:", error);
  }
}

export async function updateTask(id, updates) {
  try {
    await updateDoc(doc(db, TASKS_COLLECTION, String(id)), updates);
  } catch (error) {
    console.error("Failed to update task in Firestore:", error);
  }
}

export async function deleteTask(id) {
  try {
    await deleteDoc(doc(db, TASKS_COLLECTION, String(id)));
  } catch (error) {
    console.error("Failed to delete task from Firestore:", error);
  }
}

export async function fetchSettings() {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (snap.exists()) {
      return snap.data();
    }
    return {};
  } catch (error) {
    console.error("Failed to fetch settings from Firestore:", error);
    return {};
  }
}

export async function saveSettings(settings) {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), settings, {
      merge: true,
    });
  } catch (error) {
    console.error("Failed to save settings to Firestore:", error);
  }
}

export async function migrateFromLocalStorage() {
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
      await createTask(task);
    }

    await saveSettings({
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
