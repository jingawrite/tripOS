import { useMemo, useCallback } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import TopBar from '../components/TopBar';
import ExchangeCard from '../components/ExchangeCard';
import ScheduleCard from '../components/ScheduleCard';
import PlaceholderCard from '../components/PlaceholderCard';
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
        <h1 className="title-main">트립OS</h1>
        <p className="title-sub">여행 일정을 관리하세요</p>
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
    </div>
  );
};

export default HomePage;
