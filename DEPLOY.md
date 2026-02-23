# 배포 가이드

## GitHub Pages 배포

### 1. GitHub 저장소 생성 및 설정

1. GitHub에서 새 저장소 생성 (예: `trip-os`)
2. 저장소 Settings → Pages에서 Source를 "GitHub Actions"로 설정

### 2. 저장소 이름에 따른 base 경로 설정

**저장소 이름이 `username.github.io`인 경우:**
- `vite.config.ts`의 `base`를 `'/'`로 유지

**일반 저장소인 경우 (예: `trip-os`):**
- `.github/workflows/deploy.yml`의 build 단계에 다음 추가:
```yaml
- name: Build
  run: npm run build
  env:
    NODE_ENV: production
    VITE_BASE_PATH: /저장소이름/
```

또는 `vite.config.ts`에서 직접 수정:
```typescript
base: '/저장소이름/',
```

### 3. Git 초기화 및 푸시

```bash
# Git 저장소 초기화
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 연결 (저장소 URL로 변경)
git remote add origin https://github.com/username/trip-os.git
git branch -M main
git push -u origin main
```

### 4. 자동 배포

- `main` 또는 `master` 브랜치에 push하면 자동으로 배포됩니다
- GitHub Actions 탭에서 배포 진행 상황 확인 가능
- 배포 완료 후 `https://username.github.io/저장소이름/` 에서 확인

### 5. 수동 배포 (선택사항)

```bash
# 저장소 이름이 trip-os인 경우
npm run build:gh-pages

# 또는 직접 base 경로 지정
VITE_BASE_PATH=/trip-os/ npm run build

# gh-pages 브랜치에 배포
npx gh-pages -d dist
```

## 환경 변수

- `VITE_BASE_PATH`: GitHub Pages base 경로 (기본값: `/`)
  - 저장소 이름이 `username.github.io`가 아닌 경우 `/저장소이름/` 형태로 설정
