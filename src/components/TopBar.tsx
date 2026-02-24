import { useState } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import BottomSheet from './BottomSheet';

const TopBar = () => {
  const { editMode, toggleEditMode } = useScheduleStore();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        width: '100%',
      }}>
        <button
          onClick={toggleEditMode}
          aria-label={editMode ? '편집 완료' : '편집 모드'}
          style={{
            padding: '8px 16px',
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: editMode ? '#646cff' : '#e0e0e0',
            color: editMode ? 'white' : '#333',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {editMode ? '완료' : '편집'}
        </button>
        <button
          onClick={() => setIsBottomSheetOpen(true)}
          disabled={editMode}
          aria-label="일정 추가"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: editMode ? '#e0e0e0' : '#646cff',
            color: editMode ? '#999' : 'white',
            fontSize: '24px',
            cursor: editMode ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: editMode ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
      />
    </>
  );
};

export default TopBar;
