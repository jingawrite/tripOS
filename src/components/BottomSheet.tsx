import { useNavigate } from 'react-router-dom';
import { Category } from '../types/schedule';
import { categoryMeta } from '../lib/categoryMeta';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  emoji: string;
  label: string;
  category: Category;
}

// categoryMeta에서 메뉴 아이템 생성
const menuItems: MenuItem[] = (Object.keys(categoryMeta) as Category[]).map(
  (category) => ({
    emoji: categoryMeta[category].emoji,
    label: categoryMeta[category].label,
    category,
  })
);

const BottomSheet = ({ isOpen, onClose }: BottomSheetProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleMenuItemClick = (category: Category) => {
    navigate(`/schedule/new?category=${category}`);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="bottom-sheet-backdrop" onClick={handleBackdropClick} />
      <div className="bottom-sheet-container">
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-content">
          {menuItems.map((item) => (
            <button
              key={item.category}
              className="bottom-sheet-menu-item"
              onClick={() => handleMenuItemClick(item.category)}
              aria-label={`${item.label} 일정 추가`}
            >
              <span className="menu-item-emoji">{item.emoji}</span>
              <span className="menu-item-label">{item.label}</span>
            </button>
          ))}
        </div>
        <button className="bottom-sheet-close-button" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
    </>
  );
};

export default BottomSheet;
