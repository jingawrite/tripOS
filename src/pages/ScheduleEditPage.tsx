import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScheduleStore } from '../store/scheduleStore';
import ScheduleForm, { ScheduleFormPayload } from '../components/ScheduleForm';

/** /schedule/:id/edit – 편집 페이지 */
const ScheduleEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schedules, updateSchedule } = useScheduleStore();

  const schedule = schedules.find((s) => s.id === id);

  useEffect(() => {
    if (!id || !schedule) {
      navigate('/', { replace: true });
    }
  }, [id, schedule, navigate]);

  if (!schedule) {
    return null; // 리다이렉트 중
  }

  const handleSubmit = (payload: ScheduleFormPayload) => {
    const success = updateSchedule(schedule.id, {
      emoji: payload.emoji,
      topText: payload.topText,
      bottomText: payload.bottomText,
      date: payload.date,
      url: payload.url,
      // createdAt은 건드리지 않음 — updateSchedule이 updatedAt만 갱신
    });

    if (success) {
      navigate(`/schedule/${schedule.id}`);
    }
  };

  const handleBackClick = () => {
    navigate(`/schedule/${schedule.id}`);
  };

  return (
    <ScheduleForm
      mode="edit"
      initialValue={schedule}
      onSubmit={handleSubmit}
      onBackClick={handleBackClick}
    />
  );
};

export default ScheduleEditPage;
