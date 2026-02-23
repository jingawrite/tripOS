import { ScheduleItem } from '../types/schedule';

// ScheduleItem 배열을 sanitize하여 유효한 상태로 보정
export const sanitizeSchedules = (schedules: unknown): ScheduleItem[] => {
  if (!Array.isArray(schedules)) {
    return [];
  }

  const validSchedules: ScheduleItem[] = [];

  for (const item of schedules) {
    if (!item || typeof item !== 'object') continue;

    // 필수 필드 검증
    if (
      typeof item.id !== 'string' ||
      typeof item.category !== 'string' ||
      typeof item.emoji !== 'string' ||
      typeof item.date !== 'string' ||
      typeof item.topText !== 'string'
    ) {
      continue; // 필수 필드가 없으면 스킵
    }

    // category 유효성 검증
    const validCategories = ['boarding_pass', 'accommodation', 'sim', 'custom'];
    if (!validCategories.includes(item.category)) {
      continue;
    }

    // sortOrder 정합성 보정
    let sortOrder = typeof item.sortOrder === 'number' ? item.sortOrder : NaN;
    if (isNaN(sortOrder) || sortOrder < 0) {
      sortOrder = validSchedules.length; // 현재 인덱스로 설정
    }

    validSchedules.push({
      id: item.id,
      category: item.category,
      emoji: item.emoji || '📅',
      date: item.date,
      topText: item.topText,
      bottomText: typeof item.bottomText === 'string' ? item.bottomText : undefined,
      url: typeof item.url === 'string' ? item.url : undefined,
      sortOrder,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
    });
  }

  // sortOrder 중복/누락 보정: 0부터 N-1까지 재부여
  validSchedules.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    // sortOrder가 같으면 createdAt으로 정렬
    return a.createdAt - b.createdAt;
  });

  // sortOrder를 0부터 순차적으로 재부여
  return validSchedules.map((schedule, index) => ({
    ...schedule,
    sortOrder: index,
  }));
};
