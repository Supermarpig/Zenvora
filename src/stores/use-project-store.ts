import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, CreateProjectInput } from "@/lib/schemas";

interface ProjectState {
  projects: Project[];
  addProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (input) => {
        const now = new Date().toISOString();
        const project: Project = {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description ?? "",
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },

      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...data, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      getProject: (id) => {
        return get().projects.find((p) => p.id === id);
      },
    }),
    { name: "frameforge-projects" }
  )
);
