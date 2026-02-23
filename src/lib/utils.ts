import { Category } from '../types/schedule';
import { getCategoryDefaultValues } from './categoryMeta';

// 랜덤 이모지 생성 (custom 카테고리용)
export const getRandomEmoji = (): string => {
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
  return emojis[Math.floor(Math.random() * emojis.length)];
};

// category에 따른 기본값 설정 (categoryMeta 사용)
export const getDefaultValues = (category: Category | null) => {
  return getCategoryDefaultValues(category);
};
