# 📚 인허가정보 자동 수집 시스템 개발 히스토리

> **수업 자료용 - 프로젝트 개발 과정 전체 정리**

---

## 🎯 프로젝트 개요

### 목적
식품의약품안전처 OpenAPI(I2500)와 비즈노 사업자 조회 API를 활용하여 인허가 업소 정보를 자동으로 수집하고, 사업자번호 등 추가 정보를 통합하여 Google Sheets에 저장하는 자동화 시스템 구축

### 최종 결과물
- **13개 컬럼** 데이터 수집 (인허가번호, 업종, 업소명, 대표자명, 전화번호, 허가일자, 주소, 사업자번호, 법인번호, 사업자상태, 과세유형, 폐업일)
- **매일 오전 8시 자동 실행**
- **1일 200건 무료 사업자 조회** 제한 관리

---

## 📋 개발 단계별 작업 내역

### Phase 1: 요구사항 분석 및 설계 (2025-08-16)

#### 1.1 PRD 문서 작성
**문서**: [prd.md](./prd.md)

**주요 내용**:
- 식약처 I2500 API 스펙 분석
- 데이터 구조 설계 (8개 기본 필드)
- 매일 오전 8시 자동 실행 요구사항
- API 인증키 보안 관리 (Script Properties)

**핵심 결정사항**:
```
- 시트 구조: 1행(메타정보) + 2행(헤더) + 3행~(데이터)
- API 호출 제한: 1,000회/일
- 페이징 처리: 한 번에 10건씩 (테스트용, 추후 확장 가능)
```

#### 1.2 Task 체크리스트 작성
**문서**: [task.md](./task.md)

**실행 계획**:
1. ✅ 스프레드시트 준비 및 ID 확보
2. ✅ Apps Script 코드 삽입
3. ✅ API Key 환경변수 등록
4. ✅ setup() 최초 실행 및 권한 승인
5. ✅ 테스트 실행 및 데이터 확인
6. ✅ 자동 트리거 검증

---

### Phase 2: 기본 시스템 구축 (1차 개발)

#### 2.1 식약처 I2500 API 통합
**파일**: [Code.gs](./Code.gs) (Line 1-388)

**구현 내용**:
```javascript
// ✅ 구현된 기능
- setupHeaders() : 시트 헤더 자동 생성 (8개 컬럼)
- fetchDataFromAPI() : I2500 API 호출 및 JSON 파싱
- saveDataToSheet() : 데이터 시트 저장
- setupDailyTrigger() : 매일 오전 8시 트리거 설치
- createMenu() : 커스텀 메뉴 생성
```

**주요 기술 결정**:
- **환경변수 관리**: Script Properties로 API 키 보안 저장
- **에러 핸들링**: try-catch + Logger.log 디버깅
- **페이징 처리**: startIdx/endIdx로 반복 호출
- **주소 필터링**: 로컬 필터링으로 지역별 데이터 추출 가능

#### 2.2 초기 테스트 결과
```
✅ 성공: 식약처 API 10건 정상 수집
✅ 성공: 헤더 자동 생성 및 스타일 적용
✅ 성공: 메뉴 "I2500 수집" 생성
✅ 성공: 매일 오전 8시 트리거 설치
```

**발견된 문제**:
- ❌ 사업자번호 정보 부재 (식약처 API는 제공 안 함)
- ❌ 대표자명/전화번호 깨짐 (일부 데이터 품질 이슈)

---

### Phase 3: 사업자번호 통합 (2차 개발)

#### 3.1 문제 정의
**이슈**: 식약처 API에는 사업자번호가 없어 추가 조회 필요

**해결 방안 탐색**:
1. ❌ 국세청 API: 사업자번호로만 조회 가능 (역조회 불가)
2. ❌ I0420 API: 개별 상세 조회만 가능 (대량 처리 비효율)
3. ✅ **비즈노 무료 API**: 상호명으로 사업자번호 검색 가능

#### 3.2 비즈노 API 통합
**파일**: [Code.gs](./Code.gs) (Line 390-503)

**구현 기능**:
```javascript
// ✅ fetchBusinessNumber() 함수
- 상호명으로 사업자번호 조회
- gb=3 (상호명 검색) 파라미터 사용
- JSON 응답 파싱 및 에러 처리

// ✅ 반환 데이터
{
  bno: "사업자번호",
  cno: "법인번호",
  bstt: "사업자상태"
}
```

**API 스펙**:
```
URL: https://bizno.net/api/fapi
파라미터:
- key: API 인증키
- gb: 3 (상호명 검색)
- q: 검색어 (업소명)
- type: json
```

#### 3.3 1차 테스트 결과
```
실행 결과: 10건 중 5건 성공

✅ 성공 (5건):
- 중앙떡집, 옛날 다슬기탕, 동성각, 행운마차3호점, 서울우유길상고객센터

❌ 실패 (5건):
- 화성얼음, 쉬즈레스토랑, 또와생고기, 은평중학교, 카페 극동
```

**실패 원인 분석**:
1. API 응답 구조 문제: `items` 배열에 null 값 포함
2. 과세유형 정보 부재: status=N (기본값)

---

### Phase 4: 안정성 개선 및 기능 확장 (3차 개발)

#### 4.1 Null 필터링 로직 추가
**파일**: [Code.gs](./Code.gs) (Line 447-450)

**문제 상황**:
```json
// 비즈노 API 응답
{
  "totalCount": 1,
  "items": [
    {"company":"중앙떡집", "bno":"209-11-70128"},
    null, null, null, null, null, null, null, null, null
  ]
}
```

**해결 코드**:
```javascript
// null이 아닌 실제 데이터만 필터링
const validItems = json.items.filter(item => item !== null && item !== undefined);
```

#### 4.2 계속사업자 우선 선택 로직
**파일**: [Code.gs](./Code.gs) (Line 458-485)

**구현 내용**:
```javascript
// 우선순위: 계속사업자 > 휴업자 > 폐업자
for (const item of validItems) {
  if (item.bstt && item.bstt.includes("계속")) {
    selectedItem = item;
    break;
  }
}
```

**이유**: 같은 상호명에 여러 사업자가 있을 경우 영업 중인 업체 우선 선택

#### 4.3 국세청 실시간 조회 추가 (status=Y)
**파일**: [Code.gs](./Code.gs) (Line 410)

**변경 사항**:
```javascript
// 변경 전
let url = `${BIZNO_API_URL}?key=${apiKey}&gb=3&q=${companyName}&type=json`;

// 변경 후
let url = `${BIZNO_API_URL}?key=${apiKey}&gb=3&q=${companyName}&status=Y&type=json`;
```

**추가 제공 정보**:
- ✅ 과세유형 (taxtype): 일반과세자, 간이과세자 등
- ✅ 폐업일 (EndDt): YYYYMMDD 형식

#### 4.4 시트 구조 확장 (8개 → 13개 컬럼)
**파일**: [Code.gs](./Code.gs) (Line 89-138)

**최종 컬럼 구조**:
| 열 | 필드명 | 출처 | 비고 |
|----|--------|------|------|
| A | no | 자동 | 순번 |
| B | 인허가번호 | 식약처 I2500 | |
| C | 업종 | 식약처 I2500 | |
| D | 업소명 | 식약처 I2500 | |
| E | 대표자명 | 식약처 I2500 | |
| F | 전화번호 | 식약처 I2500 | |
| G | 허가일자 | 식약처 I2500 | |
| H | 주소 | 식약처 I2500 | |
| **I** | **사업자번호** | **비즈노** | ⭐ 추가 |
| **J** | **법인번호** | **비즈노** | ⭐ 추가 |
| **K** | **사업자상태** | **비즈노** | ⭐ 추가 |
| **L** | **과세유형** | **비즈노 (status=Y)** | ⭐ 추가 |
| **M** | **폐업일** | **비즈노 (status=Y)** | ⭐ 추가 |

---

### Phase 5: 사용량 관리 및 최적화 (4차 개발)

#### 5.1 1일 200건 제한 관리
**파일**: [Code.gs](./Code.gs) (Line 505-530)

**구현 기능**:
```javascript
// getTodayQueryCount() - 오늘 조회 건수 확인
// incrementQueryCount() - 조회 건수 증가
// 날짜 변경 시 자동 리셋
```

**사용자 경험 개선**:
```javascript
// 한도 초과 시 안내
if (remainingQuota <= 0) {
  alert("오늘의 조회 한도(200건)를 모두 사용했습니다.");
  return;
}

// 한도 부족 시 선택 조회
if (needQueryRows.length > remainingQuota) {
  alert(`조회 필요: ${needQueryRows.length}건\n남은 한도: ${remainingQuota}건\n\n${willQueryCount}건만 조회하시겠습니까?`);
}
```

#### 5.2 중복 조회 방지
**파일**: [Code.gs](./Code.gs) (Line 572-582)

**로직**:
```javascript
// 이미 사업자번호가 있는 행은 스킵
const needQueryRows = [];
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const companyName = row[3]; // D열: 업소명

  // 업소명이 있고 사업자번호가 없는 경우만
  if (companyName && companyName.trim() !== "" && (!row[8] || row[8].trim() === "")) {
    needQueryRows.push(i);
  }
}
```

#### 5.3 디버깅 로그 강화
**파일**: [Code.gs](./Code.gs) (Line 411-438)

**추가된 로그**:
```javascript
Logger.log(`비즈노 API 호출: ${companyName} (대표자: ${ceoName || "미지정"})`);
Logger.log(`  → 요청 URL: ${url}`);
Logger.log(`[${companyName}] API 응답: ${content}`);
Logger.log(`✅ 검색 결과 ${validItems.length}건 발견 (총 ${json.totalCount}건)`);
Logger.log(`  → 계속사업자 발견: ${item.company} (${item.bno})`);
```

---

### Phase 6: 최종 테스트 및 문서화

#### 6.1 최종 테스트 결과
```
실행 일시: 2025-10-15 오후 3:01

테스트 데이터: 10건
성공: 8건 (80%)
실패: 2건 (20%)

✅ 성공 사례:
- 또와생고기: 계속사업자 우선 선택 성공 (609-30-51787)
- 은평중학교: 비영리법인 정상 조회 (111-83-01092)
- 화성얼음: status=Y로 과세유형 수집 성공

❌ 실패 사례:
- 쉬즈레스토랑: API에 데이터 없음
- 카페 극동: 상호명 공백 포함으로 검색 실패

사용 현황:
- 오늘 사용: 40/200건
- 남은 한도: 160건
```

#### 6.2 성능 지표
```
평균 API 호출 시간: 1.5초/건
10건 처리 시간: 약 30초 (1초 간격 포함)
성공률: 80% (무료 API 한계)
```

---

## 🛠️ 기술 스택 및 도구

### 개발 환경
- **Google Apps Script**: JavaScript 기반 서버리스 실행 환경
- **clasp**: CLI로 로컬 코드 → Apps Script 배포
- **Git/GitHub**: 버전 관리 및 협업

### API
1. **식품의약품안전처 I2500 API**
   - 용도: 인허가 업소 기본 정보
   - 인증: API 키 (Script Properties)
   - 제한: 1,000회/일

2. **비즈노 무료 API**
   - 용도: 사업자번호 조회
   - 인증: API 키 (Script Properties)
   - 제한: 200건/일

### 주요 라이브러리
```javascript
// Google Apps Script 내장
- SpreadsheetApp: 시트 조작
- UrlFetchApp: HTTP 요청
- PropertiesService: 환경변수 관리
- ScriptApp: 트리거 관리
- LockService: 동시 실행 방지
- Utilities: 날짜/시간 처리
```

---

## 📊 코드 구조 및 아키텍처

### 파일 구조
```
인허가정보/
├── Code.gs              # 메인 로직 (609 lines)
├── appsscript.json      # Apps Script 설정
├── .clasp.json          # clasp 배포 설정
├── prd.md               # 요구사항 정의서
├── task.md              # 실행 계획 체크리스트
├── CLAUDE.md            # 프로젝트 가이드
└── README.md            # 사용 설명서
```

### 함수 구조
```
📦 설정 및 초기화
├─ setup()                    # 최초 1회 실행
├─ setupHeaders()             # 헤더 생성
├─ createMenu()               # 메뉴 생성
└─ setupDailyTrigger()        # 트리거 설치

📦 식약처 I2500 API
├─ fetchDataNow()             # 수동 실행
├─ fetchDataDaily()           # 자동 실행 (트리거)
├─ fetchDataFromAPI()         # API 호출
└─ saveDataToSheet()          # 데이터 저장

📦 비즈노 API
├─ fetchBusinessNumbers()     # 전체 조회
├─ fetchBusinessNumber()      # 개별 조회
├─ getTodayQueryCount()       # 사용량 확인
└─ incrementQueryCount()      # 사용량 증가

📦 이벤트 트리거
└─ onOpen()                   # 스프레드시트 열릴 때
```

---

## 🎓 학습 포인트 및 교훈

### 1. API 통합 전략
**배운 점**: 하나의 API로 부족할 때 여러 API를 조합하여 완전한 데이터 구축
```
식약처 API (기본 정보) + 비즈노 API (사업자번호) = 완전한 업소 정보
```

### 2. 에러 핸들링의 중요성
**문제**: 비즈노 API 응답에 null 값 포함으로 런타임 에러 발생
**해결**:
```javascript
// 방어적 프로그래밍
const validItems = json.items.filter(item => item !== null && item !== undefined);
if (validItems.length === 0) {
  return { bno: "검색결과없음", ... };
}
```

### 3. 사용자 경험 고려
**개선 사항**:
- 한도 초과 시 명확한 안내 메시지
- 진행 상황 로그 (5건마다 출력)
- 중복 조회 방지로 한도 절약
- 디버깅 로그로 문제 추적 용이

### 4. 데이터 우선순위 로직
**비즈니스 요구사항**:
```
같은 상호명에 여러 사업자 → 계속사업자 우선 선택
이유: 폐업 업체보다 영업 중인 업체 정보가 유용
```

### 5. 환경변수 관리
**보안 베스트 프랙티스**:
```javascript
// ❌ 나쁜 예
const API_KEY = "Iv9sGhjS20udITbvG1in2v9m";

// ✅ 좋은 예
const apiKey = PropertiesService.getScriptProperties().getProperty("FOOD_SAFETY_API_KEY");
```

---

## 🚀 배포 및 운영

### 배포 프로세스
```bash
# 1. 로컬에서 코드 수정
vi Code.gs

# 2. clasp로 배포
cd 인허가정보
clasp push

# 3. Git 커밋
git add .
git commit -m "feat: 기능 추가"
git push
```

### 모니터링
```
Apps Script 편집기 → 실행 로그
- 매일 오전 8시 실행 로그 확인
- 에러 발생 시 이메일 알림
- 사용량 현황 체크 (200건 제한)
```

### 유지보수 체크리스트
```
✅ API 키 유효성 확인 (만료 시 재발급)
✅ 트리거 정상 동작 확인
✅ 시트 구조 변경 금지 (헤더 행)
✅ 비즈노 API 일일 한도 관리
✅ 월 1회 데이터 품질 검증
```

---

## 📈 향후 개선 방향

### 단기 개선 (1개월)
- [ ] 주소 필터링 자동화 (설정 UI 추가)
- [ ] 페이징 크기 동적 조정 (MAX_PAGES)
- [ ] 실패 건 재시도 로직

### 중기 개선 (3개월)
- [ ] 유료 API 전환 검토 (사업자 조회 성공률 향상)
- [ ] 중복 데이터 자동 병합
- [ ] 데이터 변경 이력 관리

### 장기 개선 (6개월)
- [ ] 머신러닝 기반 데이터 매칭 (상호명 유사도)
- [ ] 웹 대시보드 구축 (Apps Script Web App)
- [ ] 다른 공공 API 통합 (위생등급, 인증 정보)

---

## 📞 문의 및 지원

**개발자**: 조병재
**프로젝트**: ASG_DB - 인허가정보 모듈
**GitHub**: [ASG_DB Repository](https://github.com/chobyoungjae/ASG_DB)

---

## 📝 참고 문서

- [PRD 문서](./prd.md) - 요구사항 정의서
- [Task 문서](./task.md) - 실행 계획 체크리스트
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 가이드
- [README.md](./README.md) - 사용 설명서
- [식약처 OpenAPI](https://www.foodsafetykorea.go.kr/api/main.do)
- [비즈노 API](https://bizno.net/openapi)

---

**🎉 프로젝트 완료: 2025-10-15**

**총 개발 기간**: 1일
**코드 라인 수**: 609 lines
**최종 버전**: v1.0.0
