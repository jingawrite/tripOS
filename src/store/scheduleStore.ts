import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ScheduleItem } from "../types/schedule";
import { STORAGE_KEYS } from "../lib/storage";
import { sanitizeSchedules } from "../lib/sanitize";

interface ScheduleStore {
  schedules: ScheduleItem[];
  editMode: boolean;
  addSchedule: (schedule: Omit<ScheduleItem, "id" | "createdAt" | "updatedAt" | "sortOrder">) => boolean;
  updateSchedule: (id: string, updates: Partial<ScheduleItem>) => boolean;
  removeSchedule: (id: string) => boolean;
  reorderSchedules: (fromIndex: number, toIndex: number) => void;
  toggleEditMode: () => void;
}

const MAX_SCHEDULES = 18;

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      schedules: [],
      editMode: false,

      addSchedule: (scheduleData) => {
        const { schedules } = get();
        
        if (schedules.length >= MAX_SCHEDULES) {
          alert("추가가 불가합니다");
          return false;
        }

        // 입력값 검증
        if (!scheduleData.emoji || !scheduleData.topText || !scheduleData.date) {
          alert("필수 항목을 입력해주세요");
          return false;
        }

        const now = Date.now();
        const newSchedule: ScheduleItem = {
          ...scheduleData,
          id: `schedule-${now}-${Math.random().toString(36).slice(2, 11)}`,
          sortOrder: schedules.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));

        return true;
      },

      updateSchedule: (id, updates) => {
        const { schedules } = get();
        const exists = schedules.some((s) => s.id === id);
        
        if (!exists) {
          return false; // 없는 ID 요청 시 실패
        }

        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === id
              ? { ...schedule, ...updates, updatedAt: Date.now() }
              : schedule
          ),
        }));

        return true;
      },

      removeSchedule: (id) => {
        const { schedules } = get();
        const exists = schedules.some((s) => s.id === id);
        
        if (!exists) {
          return false; // 없는 ID 요청 시 실패
        }

        set((state) => {
          const filtered = state.schedules.filter((schedule) => schedule.id !== id);
          return {
            schedules: filtered.map((schedule, index) => ({
              ...schedule,
              sortOrder: index,
            })),
          };
        });

        return true;
      },

      reorderSchedules: (fromIndex, toIndex) => {
        const { schedules } = get();
        
        // 인덱스 유효성 검증
        if (
          fromIndex < 0 ||
          fromIndex >= schedules.length ||
          toIndex < 0 ||
          toIndex >= schedules.length ||
          fromIndex === toIndex
        ) {
          return;
        }

        set((state) => {
          const newSchedules = [...state.schedules];
          const [moved] = newSchedules.splice(fromIndex, 1);
          newSchedules.splice(toIndex, 0, moved);

          return {
            schedules: newSchedules.map((schedule, index) => ({
              ...schedule,
              sortOrder: index,
            })),
          };
        });
      },

      toggleEditMode: () => {
        set((state) => ({
          editMode: !state.editMode,
        }));
      },
    }),
    {
      name: STORAGE_KEYS.SCHEDULES,
      partialize: (state) => ({ schedules: state.schedules }),
      // 초기화 시 sanitize 적용
      onRehydrateStorage: () => (state) => {
        if (state?.schedules) {
          state.schedules = sanitizeSchedules(state.schedules);
        }
      },
    }
  )
);
