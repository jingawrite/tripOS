import { useMemo, useCallback } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import TopBar from '../components/TopBar';
import ExchangeCard from '../components/ExchangeCard';
import ScheduleCard from '../components/ScheduleCard';
import PlaceholderCard from '../components/PlaceholderCard';
import AdSlot from '../components/AdSlot';
import { categoryMeta } from '../lib/categoryMeta';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import './HomePage.css';

const HomePage = () => {
  const { schedules, editMode, reorderSchedules } = useScheduleStore();
  
  // 일정을 sortOrder로 정렬 (메모이제이션)
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.createdAt - b.createdAt;
    });
  }, [schedules]);
  
  // 총 20칸 중 첫 번째 줄 2칸은 환율 카드, 나머지 18칸은 일정 카드
  const totalSlots = 20;
  const exchangeSlots = 2;
  const scheduleSlots = totalSlots - exchangeSlots; // 18개
  
  const scheduleCards = useMemo(() => {
    return sortedSchedules.slice(0, scheduleSlots);
  }, [sortedSchedules, scheduleSlots]);

  const placeholderCount = useMemo(() => {
    return Math.max(0, scheduleSlots - scheduleCards.length);
  }, [scheduleSlots, scheduleCards.length]);

  // contextual ad를 위한 카테고리 선택 (가장 많은 카테고리 또는 첫 번째 광고 가능 카테고리)
  const contextualCategory = useMemo(() => {
    if (editMode || scheduleCards.length === 0) {
      return null;
    }

    // 광고 가능한 카테고리 중 가장 많이 사용된 것 찾기
    const adEligibleCategories = scheduleCards
      .filter((s) => {
        const meta = categoryMeta[s.category];
        return meta?.adEligible;
      })
      .map((s) => s.category);

    if (adEligibleCategories.length === 0) {
      return null;
    }

    // 가장 많이 사용된 카테고리 반환
    const counts: Record<string, number> = {};
    adEligibleCategories.forEach((cat) => {
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? (mostCommon[0] as typeof scheduleCards[0]['category']) : null;
  }, [scheduleCards, editMode]);

  // PointerSensor with activationConstraint for long press (편집 모드에서만 활성화)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // 편집 모드가 아니거나 드롭 실패 시 무시
    if (!editMode || !over || active.id === over.id) {
      return;
    }

    const oldIndex = scheduleCards.findIndex((item) => item.id === active.id);
    const newIndex = scheduleCards.findIndex((item) => item.id === over.id);

    // 인덱스 유효성 검증
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      reorderSchedules(oldIndex, newIndex);
    }
  }, [editMode, scheduleCards, reorderSchedules]);

  return (
    <div className="home-page">
      <TopBar />
      
      <div className="title-area">
        <h1 className="title-main">TRIP OS</h1>
        <p className="title-sub">TRAVEL CHECK LIST</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid-container">
          {/* 환율 카드 (첫 번째 줄, 2칸 차지) */}
          <ExchangeCard />
          
          {/* 일정 카드들 */}
          <SortableContext
            items={scheduleCards.map((s) => s.id)}
            strategy={rectSortingStrategy}
            disabled={!editMode}
          >
            {scheduleCards.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </SortableContext>
          
          {/* Placeholder 카드들 */}
          {Array.from({ length: placeholderCount }).map((_, index) => (
            <PlaceholderCard key={`placeholder-${index}`} />
          ))}
        </div>
      </DndContext>

      {/* Contextual Ad Slot (편집 모드가 아닐 때만 표시) */}
      {!editMode && contextualCategory && (
        <div className="home-ad-container">
          <AdSlot category={contextualCategory} placement="home_card" />
        </div>
      )}
    </div>
  );
};

export default HomePage;
