# Trip OS

여행 일정을 관리하는 PWA (Progressive Web App)

## 기능

- ✈️ 일정 관리 (탑승권, 숙소, 유심, 직접 입력)
- 💱 실시간 환율 조회 (JPY, USD, THB, VND)
- 📱 PWA 지원 (오프라인 사용 가능)
- 🎨 드래그 앤 드롭으로 일정 순서 변경
- 💾 로컬 스토리지 자동 저장

## 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview
```

## 배포

자세한 배포 가이드는 [DEPLOY.md](./DEPLOY.md)를 참고하세요.

### 빠른 배포

1. GitHub 저장소 생성
2. 저장소 Settings → Pages에서 Source를 "GitHub Actions"로 설정
3. 코드 푸시:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/trip-os.git
git branch -M main
git push -u origin main
```

4. GitHub Actions가 자동으로 배포합니다

## 기술 스택

- React 18
- TypeScript
- Vite
- Zustand (상태 관리)
- React Router v6
- @dnd-kit (드래그 앤 드롭)
- Vite PWA Plugin

## 라이선스

MIT
