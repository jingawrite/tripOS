import { useSearchParams, useNavigate } from 'react-router-dom';
import { Category } from '../types/schedule';
import { useScheduleStore } from '../store/scheduleStore';
import ScheduleForm, { ScheduleFormPayload } from '../components/ScheduleForm';

const validCategories: Category[] = ['boarding_pass', 'accommodation', 'sim', 'custom'];

const NewSchedulePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addSchedule } = useScheduleStore();

  const categoryParam = searchParams.get('category');
  const category: Category = validCategories.includes(categoryParam as Category)
    ? (categoryParam as Category)
    : 'custom';

  const handleSubmit = (payload: ScheduleFormPayload) => {
    if (!payload.category) {
      payload.category = category;
    }

    const success = addSchedule({
      category: payload.category,
      emoji: payload.emoji,
      topText: payload.topText,
      bottomText: payload.bottomText,
      date: payload.date,
      url: payload.url,
    });

    if (success) {
      navigate('/');
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <ScheduleForm
      mode="create"
      defaultCategory={category}
      onSubmit={handleSubmit}
      onBackClick={handleBackClick}
    />
  );
};

export default NewSchedulePage;
