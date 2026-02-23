import { Category } from '../types/schedule';

export interface CategoryMeta {
  label: string;
  emoji: string;
  adEligible: boolean;
}

export const categoryMeta: Record<Category, CategoryMeta> = {
  boarding_pass: {
    label: '탑승권',
    emoji: '✈️',
    adEligible: true,
  },
  accommodation: {
    label: '숙소',
    emoji: '🏨',
    adEligible: true,
  },
  sim: {
    label: '유심',
    emoji: '📶',
    adEligible: true,
  },
  custom: {
    label: '직접 입력',
    emoji: '✏️',
    adEligible: false,
  },
};

// 카테고리별 기본값 가져오기 (기존 utils.ts의 getDefaultValues 대체)
export const getCategoryDefaultValues = (category: Category | null) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const defaultCategory: Category = category || 'custom';
  const meta = categoryMeta[defaultCategory];

  if (defaultCategory === 'custom') {
    // custom의 경우 랜덤 이모지 사용
    const emojis = [
      '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🍭', '🍬', '🍫',
      '🍪', '🍩', '🍨', '🍧', '🍦', '🍥', '🍤', '🍣', '🍢', '🍡',
      '🍠', '🍟', '🍞', '🍝', '🍜', '🍛', '🍚', '🍙', '🍘', '🍗',
      '🍖', '🍕', '🍔', '🍓', '🍒', '🍑', '🍐', '🍏', '🍎', '🍍',
      '🍌', '🍋', '🍊', '🍉', '🍈', '🍇', '🌽', '🌶', '🌿', '🌾',
      '🌱', '🌰', '🌯', '🌮', '🌭', '🌬', '🌫', '🌪', '🌩', '🌨',
      '🌧', '🌦', '🌥', '🌤', '🌣', '🌢', '🌡', '🌠', '🌟', '⭐',
      '✨', '💫', '💥', '💢', '💤', '💨', '💦', '💧', '💝', '💘',
      '💖', '💗', '💓', '💞', '💕', '💟', '💜', '💛', '💚', '💙',
      '💒', '💑', '💏', '💋', '💌', '💍', '💎', '💐', '🌸', '🌺',
      '🌻', '🌷', '🌹', '🌵', '🌴', '🌳', '🌲', '🌰', '🌱', '🌿',
    ];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    return {
      category: defaultCategory,
      emoji: randomEmoji,
      topText: '',
      date: today,
    };
  }

  return {
    category: defaultCategory,
    emoji: meta.emoji,
    topText: meta.label,
    date: today,
  };
};
