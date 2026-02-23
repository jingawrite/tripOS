# Vercel 배포 가이드

## 방법 1: Vercel 웹 대시보드 사용 (추천)

### 1. Vercel 계정 생성
- https://vercel.com 에서 GitHub 계정으로 로그인

### 2. 프로젝트 가져오기
1. Vercel 대시보드에서 **"Add New Project"** 클릭
2. GitHub 저장소 `jingawrite/tripOS` 선택
3. **"Import"** 클릭

### 3. 프로젝트 설정
- **Framework Preset**: Vite (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (자동 설정됨)
- **Output Directory**: `dist` (자동 설정됨)
- **Install Command**: `npm install` (자동 설정됨)

### 4. 환경 변수 (필요한 경우)
- 현재는 환경 변수 없이 작동합니다
- 향후 필요시 **Environment Variables** 섹션에서 추가

### 5. 배포
- **"Deploy"** 버튼 클릭
- 배포 완료 후 자동으로 URL 생성됨 (예: `trip-os-xxx.vercel.app`)

## 방법 2: Vercel CLI 사용

### 1. Vercel CLI 설치
```bash
npm i -g vercel
```

### 2. 로그인
```bash
vercel login
```

### 3. 배포
```bash
cd "/Users/brown/Desktop/업무/99_기타/03_트립OS"
vercel
```

### 4. 프로덕션 배포
```bash
vercel --prod
```

## 자동 배포 설정

GitHub 저장소와 연결하면:
- `main` 브랜치에 push할 때마다 자동으로 프로덕션 배포
- Pull Request 생성 시 프리뷰 배포

## 커스텀 도메인 설정

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 원하는 도메인 추가
3. DNS 설정 안내에 따라 도메인 설정

## 환경 변수 설정

Vercel 대시보드에서:
1. 프로젝트 → Settings → Environment Variables
2. 필요한 환경 변수 추가
   - 예: `VITE_API_URL`, `VITE_BASE_PATH` 등

## 참고사항

- Vercel은 자동으로 HTTPS 제공
- 전역 CDN으로 빠른 로딩 속도
- 무료 플랜으로도 충분히 사용 가능
- GitHub 연동 시 자동 배포 지원
