import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useScheduleStore } from '../store/scheduleStore';
import { Category } from '../types/schedule';
import { getDefaultValues } from '../lib/utils';
import './NewSchedulePage.css';

const NewSchedulePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addSchedule } = useScheduleStore();
  
  // category 검증 및 기본값 설정
  const categoryParam = searchParams.get('category');
  const validCategories: Category[] = ['boarding_pass', 'accommodation', 'sim', 'custom'];
  const category: Category = validCategories.includes(categoryParam as Category)
    ? (categoryParam as Category)
    : 'custom';

  const defaults = getDefaultValues(category);

  const [emoji, setEmoji] = useState(defaults.emoji);
  const [topText, setTopText] = useState(defaults.topText);
  const [bottomText, setBottomText] = useState('');
  const [date, setDate] = useState(defaults.date);
  const [url, setUrl] = useState('');

  // category 변경 시 기본값 재설정
  useEffect(() => {
    const newDefaults = getDefaultValues(category);
    setEmoji(newDefaults.emoji);
    setTopText(newDefaults.topText);
    setDate(newDefaults.date);
  }, [category]);

  const handleSave = useCallback(() => {
    // 입력값 검증
    const trimmedTopText = topText.trim();
    const trimmedEmoji = emoji.trim();
    
    if (!trimmedEmoji) {
      alert('이모지를 입력해주세요');
      return;
    }

    // topText가 비어있으면 기본값 사용 (category별)
    const finalTopText = trimmedTopText || defaults.topText || '일정';

    const trimmedUrl = url.trim();
    const finalUrl = trimmedUrl || undefined;

    const success = addSchedule({
      category,
      emoji: trimmedEmoji,
      date,
      topText: finalTopText.slice(0, 8),
      bottomText: bottomText.trim() ? bottomText.trim().slice(0, 8) : undefined,
      url: finalUrl,
    });

    if (success) {
      navigate('/');
    }
  }, [category, emoji, topText, bottomText, date, url, defaults.topText, addSchedule, navigate]);

  const handleClearUrl = () => {
    setUrl('');
  };

  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmoji(e.target.value);
  };

  const handleTopTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopText(e.target.value.slice(0, 8));
  };

  const handleBottomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBottomText(e.target.value.slice(0, 8));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  return (
    <div className="new-schedule-page">
      <div className="new-schedule-header">
        <button
          onClick={() => navigate('/')}
          className="back-button"
        >
          ←
        </button>
        <h1 className="page-title">새 일정 추가</h1>
        <button
          onClick={handleSave}
          className="save-button"
        >
          ✓
        </button>
      </div>

      <div className="form-container">
        <div className="form-group">
          <label className="form-label">이모지</label>
          <input
            type="text"
            value={emoji}
            onChange={handleEmojiChange}
            className="form-input"
            placeholder="이모지를 입력하세요"
            maxLength={10}
          />
        </div>

        <div className="form-group">
          <label className="form-label">상단 텍스트 (최대 8자)</label>
          <input
            type="text"
            value={topText}
            onChange={handleTopTextChange}
            className="form-input"
            placeholder="상단 텍스트"
            maxLength={8}
          />
          <div className="char-count">{topText.length}/8</div>
        </div>

        <div className="form-group">
          <label className="form-label">하단 텍스트 (최대 8자, 선택사항)</label>
          <input
            type="text"
            value={bottomText}
            onChange={handleBottomTextChange}
            className="form-input"
            placeholder="하단 텍스트"
            maxLength={8}
          />
          <div className="char-count">{bottomText.length}/8</div>
        </div>

        <div className="form-group">
          <label className="form-label">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">URL (선택사항)</label>
          <div className="url-input-wrapper">
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              className="form-input url-input"
              placeholder="https://..."
            />
            {url && (
              <button
                onClick={handleClearUrl}
                className="clear-url-button"
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSchedulePage;
