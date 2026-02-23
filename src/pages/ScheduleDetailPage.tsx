import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScheduleStore } from '../store/scheduleStore';
import AdSlot from '../components/AdSlot';
import './ScheduleDetailPage.css';

const ScheduleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schedules } = useScheduleStore();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const schedule = schedules.find((s) => s.id === id);
    if (!schedule) {
      // 일정을 찾을 수 없으면 홈으로 리다이렉트
      navigate('/');
      return;
    }
  }, [id, schedules, navigate]);

  const schedule = schedules.find((s) => s.id === id);

  if (!schedule) {
    return null; // 리다이렉트 중
  }

  const handleBack = () => {
    navigate('/');
  };

  const handleUrlClick = () => {
    if (schedule.url) {
      try {
        const url = schedule.url.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        // URL 열기 실패 시 무시
      }
    }
  };

  return (
    <div className="schedule-detail-page">
      <div className="detail-header">
        <button onClick={handleBack} className="back-button">
          ←
        </button>
        <h1 className="page-title">일정 상세</h1>
        <div style={{ width: '40px' }} /> {/* 공간 맞춤 */}
      </div>

      <div className="detail-content">
        <div className="detail-emoji">{schedule.emoji}</div>
        <div className="detail-top-text">{schedule.topText}</div>
        {schedule.bottomText && (
          <div className="detail-bottom-text">{schedule.bottomText}</div>
        )}
        <div className="detail-date">날짜: {schedule.date}</div>
        {schedule.url && (
          <button
            onClick={handleUrlClick}
            className="detail-url-button"
            disabled={!schedule.url.trim() || (!schedule.url.startsWith('http://') && !schedule.url.startsWith('https://'))}
          >
            링크 열기
          </button>
        )}
      </div>

      {/* 광고 슬롯 (상세 화면 하단) */}
      <AdSlot category={schedule.category} placement="detail_bottom" />
    </div>
  );
};

export default ScheduleDetailPage;
