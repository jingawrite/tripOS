import { useState, useEffect } from 'react';
import { ScheduleItem, Category } from '../types/schedule';
import { getDefaultValues } from '../lib/utils';
import './ScheduleForm.css';

export type FormMode = 'create' | 'edit' | 'readonly';

export interface ScheduleFormPayload {
  emoji: string;
  topText: string;
  bottomText?: string;
  date: string;
  url?: string;
  category?: Category;
}

interface ScheduleFormProps {
  /** 모드: create(생성), edit(수정), readonly(읽기 전용) */
  mode: FormMode;
  /** edit/readonly 모드에서 사용할 기존 일정 데이터 */
  initialValue?: ScheduleItem;
  /** create 모드에서 사용할 기본 카테고리 */
  defaultCategory?: Category;
  /** create/edit 모드에서 폼 제출 시 호출되는 콜백 (스텁 가능) */
  onSubmit?: (payload: ScheduleFormPayload) => void;
  /** readonly 모드에서 편집 버튼 클릭 시 호출되는 콜백 */
  onEditClick?: () => void;
  /** 뒤로가기 버튼 클릭 시 호출되는 콜백 */
  onBackClick?: () => void;
}

const ScheduleForm = ({
  mode,
  initialValue,
  defaultCategory,
  onSubmit,
  onEditClick,
  onBackClick,
}: ScheduleFormProps) => {
  // 기본값 계산
  const defaults = getDefaultValues(defaultCategory ?? initialValue?.category ?? 'custom');

  const [emoji, setEmoji] = useState(initialValue?.emoji ?? defaults.emoji);
  const [topText, setTopText] = useState(initialValue?.topText ?? defaults.topText);
  const [bottomText, setBottomText] = useState(initialValue?.bottomText ?? '');
  const [date, setDate] = useState(initialValue?.date ?? defaults.date);
  const [url, setUrl] = useState(initialValue?.url ?? '');

  // create 모드 – defaultCategory 변경 시 기본값 재설정
  useEffect(() => {
    if (mode === 'create' && defaultCategory) {
      const newDefaults = getDefaultValues(defaultCategory);
      setEmoji(newDefaults.emoji);
      setTopText(newDefaults.topText);
      setDate(newDefaults.date);
    }
  }, [defaultCategory, mode]);

  // initialValue 변경 시 폼 값 업데이트 (edit/readonly)
  useEffect(() => {
    if (initialValue && (mode === 'edit' || mode === 'readonly')) {
      setEmoji(initialValue.emoji);
      setTopText(initialValue.topText);
      setBottomText(initialValue.bottomText ?? '');
      setDate(initialValue.date);
      setUrl(initialValue.url ?? '');
    }
  }, [initialValue, mode]);

  // ── 제출 핸들러 ──
  const handleSubmit = () => {
    if (mode === 'readonly') return;

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji) {
      alert('이모지를 입력해주세요');
      return;
    }

    const trimmedTopText = topText.trim();
    const finalTopText = trimmedTopText || defaults.topText || '일정';

    const payload: ScheduleFormPayload = {
      emoji: trimmedEmoji,
      topText: finalTopText.slice(0, 8),
      bottomText: bottomText.trim() ? bottomText.trim().slice(0, 8) : undefined,
      date,
      url: url.trim() || undefined,
      category: defaultCategory ?? initialValue?.category,
    };

    if (onSubmit) {
      onSubmit(payload);
    } else {
      console.log('[ScheduleForm] Submit (stub):', payload);
    }
  };

  // ── URL 열기 핸들러 ──
  const handleUrlClick = () => {
    const target = initialValue?.url?.trim();
    if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  // ── 헤더 타이틀 ──
  const getTitle = () => {
    if (mode === 'create') return '일정 등록';
    if (mode === 'edit') return '일정 편집';
    return '일정 상세';
  };

  // ── 헤더 우측 액션 버튼 ──
  const renderHeaderRight = () => {
    if (mode === 'readonly') {
      return (
        <button
          onClick={onEditClick}
          className="sf-header-btn sf-edit-btn"
          aria-label="편집"
        >
          편집
        </button>
      );
    }
    return (
      <button
        onClick={handleSubmit}
        className="sf-header-btn sf-save-btn"
        aria-label="저장"
      >
        ✓
      </button>
    );
  };

  const isEditable = mode === 'create' || mode === 'edit';

  return (
    <div className="schedule-form-page">
      {/* ── 헤더 ── */}
      <div className="sf-header">
        <button
          onClick={onBackClick}
          className="sf-header-btn sf-back-btn"
          aria-label="뒤로"
        >
          ←
        </button>
        <h1 className="sf-title">{getTitle()}</h1>
        {renderHeaderRight()}
      </div>

      {/* ── 본문 ── */}
      <div className="sf-content">
        {isEditable ? (
          /* ===== 편집 폼 (create / edit) ===== */
          <>
            <div className="sf-field">
              <label className="sf-label">이모지</label>
              <div className="sf-input-wrapper">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="sf-input"
                  placeholder="이모지를 입력하세요"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="sf-field">
              <label className="sf-label">상단 텍스트</label>
              <div className="sf-input-wrapper">
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value.slice(0, 8))}
                  className="sf-input"
                  placeholder="상단 텍스트"
                  maxLength={8}
                />
              </div>
              <div className="sf-char-count">{topText.length}/8</div>
            </div>

            <div className="sf-field">
              <label className="sf-label">하단 텍스트 <span className="sf-optional">선택</span></label>
              <div className="sf-input-wrapper">
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value.slice(0, 8))}
                  className="sf-input"
                  placeholder="하단 텍스트"
                  maxLength={8}
                />
              </div>
              <div className="sf-char-count">{bottomText.length}/8</div>
            </div>

            <div className="sf-field">
              <label className="sf-label">날짜</label>
              <div className="sf-input-wrapper">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="sf-input sf-date-input"
                />
              </div>
            </div>

            <div className="sf-field">
              <label className="sf-label">URL <span className="sf-optional">선택</span></label>
              <div className="sf-url-wrapper">
                <div className="sf-input-wrapper sf-url-input-wrapper">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="sf-input sf-url-input"
                    placeholder="https://..."
                  />
                </div>
                {url && (
                  <button
                    onClick={() => setUrl('')}
                    className="sf-clear-url"
                    type="button"
                    aria-label="URL 전체 삭제"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ===== 읽기 전용 (readonly) ===== */
          <>
            <div className="sf-field">
              <label className="sf-label">이모지</label>
              <div className="sf-readonly-input">
                {initialValue?.emoji || '📅'}
              </div>
            </div>

            <div className="sf-field">
              <label className="sf-label">상단 텍스트</label>
              <div className="sf-readonly-input">
                {initialValue?.topText || ''}
              </div>
            </div>

            {initialValue?.bottomText && (
              <div className="sf-field">
                <label className="sf-label">하단 텍스트</label>
                <div className="sf-readonly-input">
                  {initialValue.bottomText}
                </div>
              </div>
            )}

            <div className="sf-field">
              <label className="sf-label">날짜</label>
              <div className="sf-readonly-input">
                {initialValue?.date || ''}
              </div>
            </div>

            {initialValue?.url && initialValue.url.trim() && (
              <div className="sf-field">
                <label className="sf-label">URL</label>
                <div className="sf-url-wrapper">
                  <div className="sf-readonly-input sf-readonly-url">
                    {initialValue.url}
                  </div>
                  <button
                    onClick={handleUrlClick}
                    className="sf-link-btn"
                    aria-label="URL 열기"
                    disabled={
                      !initialValue.url.trim() ||
                      (!initialValue.url.startsWith('http://') &&
                        !initialValue.url.startsWith('https://'))
                    }
                  >
                    열기
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScheduleForm;
