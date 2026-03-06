import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { scheduleTaskReminder, cancelAllTaskReminders, cancelTaskReminder } from './notifications';
import { db } from "@/src/firebaseConfig";

export interface Project {
  id: string;
  title: string;
  userId: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: Timestamp;
  taskCount?: {
    todo: number;
    doing: number;
    review: number;
    done: number;
    total: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "DOING" | "REVIEW" | "DONE";
  createdAt: Timestamp;
  projectId: string;
  priority?: 'Alta' | 'Media' | 'Baja';
  dueDate?: Date | any;
  startDate?: Date | any;
  reminderDate?: Date | any;
  reminderEnabled?: boolean;
  notificationId?: string;
  assignee?: string;
  labels?: Array<{ name: string; color: string }>;
  collaborators?: Array<{ id: string; name: string }>;
  commentsCount?: number;
}

export function subscribeToProjects(
  userId: string,
  callback: (projects: Project[]) => void
) {
  const q = query(
    collection(db, "projects"),
    where("userId", "==", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const projects: Project[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];

      projects.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(projects);
    },
    (error) => {
      console.error("Error fetching projects:", error);
      callback([]);
    }
  );
}

export async function createProject(
  title: string,
  userId: string,
  options?: {
    description?: string;
    color?: string;
    icon?: string;
  }
) {
  const docRef = await addDoc(collection(db, "projects"), {
    title,
    userId,
    description: options?.description || "",
    color: options?.color || "#3B82F6",
    icon: options?.icon || "folder",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProject(
  projectId: string,
  data: {
    title?: string;
    description?: string;
    color?: string;
    icon?: string;
  }
) {
  await updateDoc(doc(db, "projects", projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  const tasksSnapshot = await getDocs(
    collection(db, "projects", projectId, "tasks")
  );
  const deletePromises = tasksSnapshot.docs.map((taskDoc) =>
    deleteDoc(taskDoc.ref)
  );
  await Promise.all(deletePromises);

  await deleteDoc(doc(db, "projects", projectId));
}

export function subscribeToTasks(
  projectId: string,
  callback: (tasks: Task[]) => void
) {
  const q = query(collection(db, "projects", projectId, "tasks"));

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks: Task[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        projectId,
        ...doc.data(),
      })) as Task[];

      tasks.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });

      callback(tasks);
    },
    (error) => {
      console.error("Error fetching tasks:", error);
      callback([]);
    }
  );
}

export async function createTask(
  projectId: string,
  taskData: {
    title: string;
    description: string;
    status: Task["status"];
    priority?: "Alta" | "Media" | "Baja";
    dueDate?: Date;
    startDate?: Date;
    reminderDate?: Date;
    reminderEnabled?: boolean;
    assignee?: string;
    labels?: Array<{ name: string; color: string }>;
  }
) {
  const dataToSave: any = {
    title: taskData.title,
    description: taskData.description,
    status: taskData.status,
    createdAt: serverTimestamp(),
  };

  if (taskData.priority) {
    dataToSave.priority = taskData.priority;
  }

  if (taskData.dueDate) {
    dataToSave.dueDate = Timestamp.fromDate(taskData.dueDate);
  }

  if (taskData.startDate) {
    dataToSave.startDate = Timestamp.fromDate(taskData.startDate);
  }

  if (taskData.reminderDate) {
    dataToSave.reminderDate = Timestamp.fromDate(taskData.reminderDate);
    dataToSave.reminderEnabled = taskData.reminderEnabled ?? true;
  }

  if (taskData.assignee) {
    dataToSave.assignee = taskData.assignee;
  }

  if (taskData.labels && taskData.labels.length > 0) {
    dataToSave.labels = taskData.labels;
  }

  dataToSave.commentsCount = 0;

  const docRef = await addDoc(
    collection(db, "projects", projectId, "tasks"),
    dataToSave
  );

  if (taskData.reminderEnabled && taskData.reminderDate) {
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);
    const projectTitle = projectSnap.exists() ? projectSnap.data().title : "Proyecto";
    const notificationId = await scheduleTaskReminder(
      docRef.id,
      taskData.title,
      taskData.reminderDate,
      projectId,
      projectTitle
    );

    // Guardar el ID de la notificación
    if (notificationId) {
      await updateDoc(doc(db, "projects", projectId, "tasks", docRef.id), {
        notificationId,
      });
    }
  }

  return docRef.id;
}

export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: Task["status"]
) {
  await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
    status,
  });
}

export async function updateTask(
  projectId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: Task["status"];
    priority?: "Alta" | "Media" | "Baja";
    dueDate?: Date;
    startDate?: Date;
    reminderDate?: Date;
    reminderEnabled?: boolean;
    assignee?: string;
    labels?: Array<{ name: string; color: string }>;
  }
) {
  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.assignee !== undefined) updateData.assignee = data.assignee;
  if (data.labels !== undefined) updateData.labels = data.labels;

  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? Timestamp.fromDate(data.dueDate) : null;
  }

  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate ? Timestamp.fromDate(data.startDate) : null;
  }

  if (data.reminderDate !== undefined) {
    updateData.reminderDate = data.reminderDate ? Timestamp.fromDate(data.reminderDate) : null;
  }

  if (data.reminderEnabled !== undefined) {
    updateData.reminderEnabled = data.reminderEnabled;
  }

  const taskRef = doc(db, "projects", projectId, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);

  if (taskSnap.exists()) {
    const currentTask = taskSnap.data();

    // Cancelar notificación anterior si existe
    if (currentTask.notificationId) {
      await cancelTaskReminder(currentTask.notificationId);
      updateData.notificationId = null;
    }
    if (data.reminderEnabled && data.reminderDate && data.title) {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      const projectTitle = projectSnap.exists() ? projectSnap.data().title : "Proyecto";
      const notificationId = await scheduleTaskReminder(
        taskId,
        data.title,
        data.reminderDate,
        projectId,        
        projectTitle
      );

      if (notificationId) {
        updateData.notificationId = notificationId;
      }
    }
  }

  await updateDoc(taskRef, updateData);
}
export async function deleteTask(projectId: string, taskId: string) {
  await cancelAllTaskReminders(taskId);

  await deleteDoc(doc(db, "projects", projectId, "tasks", taskId));
}

export async function getProjectTaskCounts(projectId: string): Promise<{
  todo: number;
  doing: number;
  review: number;
  done: number;
  total: number;
}> {
  const tasksSnapshot = await getDocs(
    collection(db, "projects", projectId, "tasks")
  );

  const counts = { todo: 0, doing: 0, review: 0, done: 0, total: 0 };

  tasksSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    counts.total++;
    switch (data.status) {
      case "TODO":
        counts.todo++;
        break;
      case "DOING":
        counts.doing++;
        break;
      case "REVIEW":
        counts.review++;
        break;
      case "DONE":
        counts.done++;
        break;
    }
  });

  return counts;
}