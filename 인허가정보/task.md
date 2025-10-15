# ✅ Task 문서 – 실행 계획 체크리스트

## 1. 스프레드시트 준비

- [ ] 새 스프레드시트 생성, 시트명 `I2500_업소`로 지정
- [ ] 스프레드시트 ID 확보

## 2. Apps Script 코드 삽입

- [ ] Extensions → Apps Script에서 CLAUDE.md 내 제공된 코드 붙여넣기
- [ ] `SPREADSHEET_ID` 변수에 ID 입력

## 3. API Key 환경변수 등록

- [ ] Apps Script → 프로젝트 설정 → Script Properties
- [ ] Key: `FOOD_SAFETY_API_KEY`, Value: 발급받은 인증키 입력

## 4. setup() 최초 실행

- [ ] 권한 승인
- [ ] 헤더 행 생성 및 메뉴 추가
- [ ] 트리거 자동 생성 확인

## 5. 테스트 실행

- [ ] 메뉴 → I2500 수집 → 지금 가져오기 실행
- [ ] 시트에 데이터 정상 추가 확인

## 6. 자동 트리거 검증

- [ ] 오전 8시 실행 로그 확인
- [ ] 메타 정보에 최종 실행 시각 업데이트 확인

## 7. 추가 설정 (선택)

- [ ] `FILTERS`에 업종/변경일자 조건 추가
- [ ] `FETCH_SIZE` 최적화
