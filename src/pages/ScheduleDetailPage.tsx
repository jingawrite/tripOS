import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScheduleStore } from '../store/scheduleStore';
import ScheduleForm from '../components/ScheduleForm';

const ScheduleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schedules } = useScheduleStore();

  const schedule = schedules.find((s) => s.id === id);

  useEffect(() => {
    if (!id || !schedule) {
      navigate('/', { replace: true });
    }
  }, [id, schedule, navigate]);

  if (!schedule) {
    return null; // 리다이렉트 중
  }

  const handleEditClick = () => {
    navigate(`/schedule/${id}/edit`);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <ScheduleForm
      mode="readonly"
      initialValue={schedule}
      onEditClick={handleEditClick}
      onBackClick={handleBackClick}
    />
  );
};

export default ScheduleDetailPage;
