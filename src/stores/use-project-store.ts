import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, CreateProjectInput, Character } from "@/lib/schemas";

interface ProjectState {
  projects: Project[];
  addProject: (input: CreateProjectInput) => Project;
  importProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  addCharacter: (projectId: string, character: Omit<Character, "id">) => void;
  updateCharacter: (projectId: string, characterId: string, data: Partial<Omit<Character, "id">>) => void;
  removeCharacter: (projectId: string, characterId: string) => void;
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
          characters: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },

      importProject: (project) => {
        const exists = get().projects.some((p) => p.id === project.id);
        if (exists) {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : p
            ),
          }));
        } else {
          set((state) => ({ projects: [...state.projects, project] }));
        }
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

      addCharacter: (projectId, input) => {
        const character: Character = { id: crypto.randomUUID(), ...input };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, characters: [...(p.characters ?? []), character], updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      updateCharacter: (projectId, characterId, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  characters: (p.characters ?? []).map((c) =>
                    c.id === characterId ? { ...c, ...data } : c
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      removeCharacter: (projectId, characterId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  characters: (p.characters ?? []).filter((c) => c.id !== characterId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
    }),
    { name: "frameforge-projects" }
  )
);
