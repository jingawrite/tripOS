import React, { useEffect } from 'react';
import { Category } from '../types/schedule';
import { categoryMeta } from '../lib/categoryMeta';
import { useAdProvider } from '../lib/AdProvider';
import './AdSlot.css';

export type AdPlacement = 'home_card' | 'detail_bottom';

interface AdSlotProps {
  category: Category;
  placement: AdPlacement;
}

const AdSlot = ({ category, placement }: AdSlotProps) => {
  const { loadAd } = useAdProvider();
  const meta = categoryMeta[category];

  // 광고 가능한 카테고리가 아니면 렌더링하지 않음
  if (!meta.adEligible) {
    return null;
  }

  // 컴포넌트 마운트 시 광고 로드
  useEffect(() => {
    loadAd(category, placement);
  }, [category, placement, loadAd]);

  return (
    <div className="ad-slot" data-category={category} data-placement={placement}>
      <div className="ad-slot-label">AD SLOT - {category}</div>
      <div className="ad-slot-placeholder">
        {/* 향후 실제 광고 SDK가 여기에 렌더링됨 */}
      </div>
    </div>
  );
};

export default AdSlot;
