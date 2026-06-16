# 강남 3구 실거래가 Web

`home-search/apps/web` public React/Vite 화면을 이식한 프론트엔드다. v1은 지도 탐색, 지역/단지 마커, 단지 검색, 자동완성, 단지 상세, 거래 목록, 거래 추세만 포함한다.

## 실행

```bash
npm install
npm run dev
```

기본 개발 API 서버는 `http://localhost:8080`이다. 다른 주소를 사용할 때는 `VITE_API_SERVER_IP`를 설정한다.

## 검증

```bash
npm run test
npm run build
```

## 포함 범위

- Kakao 지도 surface
- `/api/v1/map/regions`
- `/api/v1/map/complexes`
- `/api/v1/search/complexes`
- `/api/v1/search/complexes/suggestions`
- `/api/v1/region`
- `/api/v1/detail`
- `/api/v1/trade`
- `/api/v1/complex`

## 제외 범위

- admin route
- admin API client
- 좌표 보정 관리자
- 메타데이터 관리자
- 인증, 추천, 알림, 즐겨찾기
