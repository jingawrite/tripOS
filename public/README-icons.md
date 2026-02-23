# PWA 아이콘 생성 가이드

PWA가 정상 작동하려면 다음 아이콘 파일들이 `public` 폴더에 필요합니다:

## 필수 아이콘

1. **pwa-192x192.png** (192x192 픽셀)
2. **pwa-512x512.png** (512x512 픽셀)

## 선택적 아이콘

3. **apple-touch-icon.png** (180x180 픽셀) - iOS용
4. **favicon.ico** - 브라우저 탭 아이콘

## 아이콘 생성 방법

### 방법 1: 온라인 도구 사용
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

### 방법 2: 이미지 편집 도구 사용
- 512x512 PNG 이미지를 준비
- 192x192로 리사이즈하여 pwa-192x192.png 생성
- 원본을 pwa-512x512.png로 저장

### 방법 3: 임시 아이콘 (개발용)
현재 `icon.svg` 파일이 있으므로, 이를 PNG로 변환하여 사용할 수 있습니다.

## 참고

아이콘이 없어도 PWA는 작동하지만, 설치 시 기본 아이콘이 표시됩니다.
실제 배포 전에는 적절한 아이콘을 생성하는 것을 권장합니다.
