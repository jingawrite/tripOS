# ScheduleForm 사용 가이드

## Props 인터페이스

```typescript
interface ScheduleFormProps {
  mode: 'create' | 'edit' | 'readonly';
  initialValue?: ScheduleItem;      // edit/readonly 모드용
  defaultCategory?: Category;        // create 모드용
  onSubmit?: (payload) => void;       // 제출 콜백 (선택사항, 스텁 가능)
}
```

## 사용 예시

### 1. Create 모드 (새 일정 등록)

```tsx
import ScheduleForm from '../components/ScheduleForm';
import { Category } from '../types/schedule';

const NewSchedulePage = () => {
  const handleSubmit = (payload) => {
    console.log('Create payload:', payload);
    // addSchedule(payload) 등 실제 로직 연결
  };

  return (
    <ScheduleForm
      mode="create"
      defaultCategory="boarding_pass"
      onSubmit={handleSubmit}
    />
  );
};
```

### 2. Edit 모드 (일정 수정)

```tsx
import ScheduleForm from '../components/ScheduleForm';
import { ScheduleItem } from '../types/schedule';

const EditSchedulePage = ({ schedule }: { schedule: ScheduleItem }) => {
  const handleSubmit = (payload) => {
    console.log('Edit payload:', payload);
    // updateSchedule(schedule.id, payload) 등 실제 로직 연결
  };

  return (
    <ScheduleForm
      mode="edit"
      initialValue={schedule}
      onSubmit={handleSubmit}
    />
  );
};
```

### 3. Readonly 모드 (일정 상세 보기)

```tsx
import ScheduleForm from '../components/ScheduleForm';
import { ScheduleItem } from '../types/schedule';

const DetailSchedulePage = ({ schedule }: { schedule: ScheduleItem }) => {
  return (
    <ScheduleForm
      mode="readonly"
      initialValue={schedule}
    />
  );
};
```

### 4. 스텁 모드 (onSubmit 없이)

```tsx
// onSubmit을 제공하지 않으면 콘솔에 출력만 함
<ScheduleForm
  mode="create"
  defaultCategory="custom"
/>
```

## 타이틀

- `create`: "일정 등록"
- `edit`: "일정 편집"
- `readonly`: "일정 상세"

## 필드 순서

1. 이모지
2. 상단 텍스트 (최대 8자)
3. 하단 텍스트 (최대 8자, 선택사항)
4. 날짜
5. URL (선택사항)

## 다음 단계

기존 페이지들(`NewSchedulePage`, `ScheduleDetailPage`, `ScheduleEditPage`)을 새로운 인터페이스에 맞게 업데이트 필요.
