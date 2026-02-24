import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ScheduleItem } from "../types/schedule";
import { STORAGE_KEYS } from "../lib/storage";
import { sanitizeSchedules } from "../lib/sanitize";
import { logAudit } from "../lib/security/auditLog";
import { sanitizeText, sanitizeEmoji, sanitizeUrl as xssSanitizeUrl } from "../lib/security/xss";
import { validateScheduleInput, validateId } from "../lib/security/inputValidator";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "../lib/security/rateLimiter";

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

        // Rate Limit 검사
        const rateResult = checkRateLimit('data:mutation', RATE_LIMIT_PRESETS.DATA_MUTATION);
        if (!rateResult.allowed) {
          logAudit({
            action: 'SECURITY_RATE_LIMIT_HIT',
            resource: 'schedule',
            details: `Rate limit exceeded for schedule creation`,
          });
          alert(rateResult.reason || '요청이 너무 많습니다. 잠시 후 시도해주세요.');
          return false;
        }

        // 입력값 종합 검증
        const validation = validateScheduleInput(scheduleData);
        if (!validation.valid) {
          logAudit({
            action: 'SECURITY_INPUT_INVALID',
            resource: 'schedule',
            details: validation.errors.join(', '),
          });
          alert(validation.errors[0] || "필수 항목을 입력해주세요");
          return false;
        }

        // XSS Sanitization 적용
        const sanitizedEmoji = sanitizeEmoji(scheduleData.emoji);
        const sanitizedTopText = sanitizeText(scheduleData.topText);
        const sanitizedBottomText = scheduleData.bottomText
          ? sanitizeText(scheduleData.bottomText)
          : undefined;
        const sanitizedUrl = scheduleData.url
          ? xssSanitizeUrl(scheduleData.url)
          : undefined;

        if (!sanitizedEmoji || !sanitizedTopText || !scheduleData.date) {
          alert("필수 항목을 입력해주세요");
          return false;
        }

        const now = Date.now();
        const newSchedule: ScheduleItem = {
          category: scheduleData.category,
          emoji: sanitizedEmoji,
          date: scheduleData.date,
          topText: sanitizedTopText.slice(0, 8),
          bottomText: sanitizedBottomText?.slice(0, 8),
          url: sanitizedUrl || undefined,
          id: `schedule-${now}-${Math.random().toString(36).slice(2, 11)}`,
          sortOrder: schedules.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));

        // Audit Log 기록
        logAudit({
          action: 'DATA_CREATE',
          resource: 'schedule',
          resourceId: newSchedule.id,
          details: `일정 생성: ${sanitizedTopText}`,
        });

        return true;
      },

      updateSchedule: (id, updates) => {
        // ID 검증
        const idValidation = validateId(id);
        if (!idValidation.valid) {
          logAudit({
            action: 'SECURITY_INPUT_INVALID',
            resource: 'schedule',
            details: `Invalid schedule ID: ${id}`,
          });
          return false;
        }

        const { schedules } = get();
        const exists = schedules.some((s) => s.id === id);
        
        if (!exists) {
          return false;
        }

        // Rate Limit 검사
        const rateResult = checkRateLimit('data:mutation', RATE_LIMIT_PRESETS.DATA_MUTATION);
        if (!rateResult.allowed) {
          logAudit({
            action: 'SECURITY_RATE_LIMIT_HIT',
            resource: 'schedule',
            resourceId: id,
          });
          return false;
        }

        // 업데이트 값 sanitize
        const sanitizedUpdates: Partial<ScheduleItem> = { ...updates };
        if (updates.emoji) sanitizedUpdates.emoji = sanitizeEmoji(updates.emoji);
        if (updates.topText) sanitizedUpdates.topText = sanitizeText(updates.topText).slice(0, 8);
        if (updates.bottomText) sanitizedUpdates.bottomText = sanitizeText(updates.bottomText).slice(0, 8);
        if (updates.url) sanitizedUpdates.url = xssSanitizeUrl(updates.url) || undefined;

        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === id
              ? { ...schedule, ...sanitizedUpdates, updatedAt: Date.now() }
              : schedule
          ),
        }));

        // Audit Log 기록
        logAudit({
          action: 'DATA_UPDATE',
          resource: 'schedule',
          resourceId: id,
          details: `일정 수정`,
        });

        return true;
      },

      removeSchedule: (id) => {
        // ID 검증
        const idValidation = validateId(id);
        if (!idValidation.valid) {
          return false;
        }

        const { schedules } = get();
        const exists = schedules.some((s) => s.id === id);
        
        if (!exists) {
          return false;
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

        // Audit Log 기록
        logAudit({
          action: 'DATA_DELETE',
          resource: 'schedule',
          resourceId: id,
          details: '일정 삭제',
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

        // Audit Log 기록
        logAudit({
          action: 'DATA_REORDER',
          resource: 'schedule',
          details: `순서 변경: ${fromIndex} → ${toIndex}`,
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
