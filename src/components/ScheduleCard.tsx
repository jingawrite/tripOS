import { ScheduleItem } from '../types/schedule';
import { useNavigate } from 'react-router-dom';
import { useScheduleStore } from '../store/scheduleStore';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './ScheduleCard.css';

interface ScheduleCardProps {
  schedule: ScheduleItem;
}

const ScheduleCard = ({ schedule }: ScheduleCardProps) => {
  const navigate = useNavigate();
  const { editMode, removeSchedule } = useScheduleStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: schedule.id,
    disabled: !editMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = () => {
    if (!editMode) {
      navigate(`/schedule/${schedule.id}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('정말 삭제하시겠어요?')) {
      removeSchedule(schedule.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editMode ? listeners : {})}
      onClick={handleCardClick}
      className={`schedule-card ${editMode ? 'edit-mode' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      {editMode && (
        <button
          onClick={handleDeleteClick}
          className="delete-button"
          type="button"
        >
          −
        </button>
      )}
      <div className="schedule-emoji">{schedule.emoji}</div>
      <div className="schedule-top-text">{schedule.topText}</div>
      {schedule.bottomText && (
        <div className="schedule-bottom-text">{schedule.bottomText}</div>
      )}
    </div>
  );
};

export default ScheduleCard;
