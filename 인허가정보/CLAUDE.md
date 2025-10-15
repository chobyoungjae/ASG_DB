# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

ASG_DB는 Google Apps Script 기반의 업무 자동화 시스템으로, 다음 4가지 주요 모듈로 구성됩니다:

1. **인허가정보** - 식약처 OpenAPI(I2500)를 통한 인허가 업소 정보 자동 수집
2. **정산** - 쿠팡/배민 정산 데이터 처리 및 개인정산 생성
3. **DB** - 스프레드시트 편집 트리거 기반 데이터 전송 및 캘린더 동기화
4. **main_Schedule** - 스케줄 관리 및 영업자별 캘린더 이벤트 자동 생성

## 개발 환경 설정

### Google Apps Script 배포 (clasp)

각 디렉토리는 독립적인 Apps Script 프로젝트입니다:

```bash
# clasp 설치 (최초 1회)
npm install -g @google/clasp

# 로그인
clasp login

# 특정 프로젝트로 푸시
cd DB
clasp push

cd ../정산
clasp push

cd ../main_Schedule
clasp push
```

### 환경변수 설정 (Script Properties)

식약처 API 인증키는 Apps Script 프로젝트 설정에서 관리:
- **Key**: `FOOD_SAFETY_API_KEY`
- **Value**: 발급받은 인증키

설정 위치: Apps Script 편집기 → 프로젝트 설정 → Script Properties

## 아키텍처 핵심 개념

### 트리거 기반 워크플로우

모든 모듈은 Google Sheets 이벤트 트리거를 통해 동작:

1. **onEdit 트리거** - 셀 편집 시 실행 (DB/handleEditTrigger.js, main_Schedule/Code.js)
2. **Time-based 트리거** - 매일 오전 8시 자동 실행 (인허가정보 수집)
3. **onOpen 트리거** - 스프레드시트 열릴 때 커스텀 메뉴 생성

### 시트 간 데이터 흐름

```
[DB 시트] "상태" 열 = "TM성공"
  ↓ (handleEditTrigger)
[ASG 스케줄] "스케줄" 시트에 데이터 전송
  ↓ (main_Schedule/Code.js)
영업자별 구글 캘린더에 이벤트 생성
```

### 핵심 데이터 구조

**문서ID 시트** (모든 모듈에서 참조):
- A열: 문서명
- B열: 영업자명
- C열: 스프레드시트 ID
- E열: 캘린더 ID

**영업자 시트**:
- A열: 영업자 코드
- B열: 영업자명
- C~F열: 정산 관련 계산 값
- H~I열: VLOOKUP 참조 값

## 주요 모듈별 기능

### DB/handleEditTrigger.js

**목적**: "상태" 열이 "TM성공"으로 변경되면 [ASG] 스케줄 시트로 데이터 자동 전송

**핵심 로직**:
- `LockService`로 동시 실행 방지 (30초 timeout)
- 헤더명 기반 동적 열 인덱스 매핑
- 문서ID 시트에서 대상 스프레드시트 ID 조회
- B~Z 열 중 빈 행 찾아 데이터 삽입 (없으면 appendRow)

**주의사항**:
- 절대 헤더 행(1행) 수정 금지
- "전송상태" 열 필수 (✅전송완료/❌전송실패 기록)

### main_Schedule/Code.js

**목적**: "영업자" 열 변경 시 해당 영업자의 캘린더에 일정 자동 등록/변경

**핵심 로직**:
- 영업자 변경 시 이전 캘린더 이벤트 삭제 후 새 캘린더에 재생성
- `getColumnIndex()` 함수로 헤더명 기반 동적 열 참조
- TM 날짜를 "YY.MM.DD" 포맷으로 변환하여 이벤트 설명에 포함
- "고유ID" 열에 이벤트 ID 저장하여 중복 방지

**캘린더 이벤트 정보**:
- 제목: 상호명
- 날짜: 방문날자 (종일 일정)
- 설명: 상세주소, 사업자번호, 전화번호, 코멘트, TM 날자

**데이터 업로드 기능** (`copyFilteredSortedDataToCoupangSheet_AppendAfterLast`):
- 영업자 시트의 A열 코드로 필터링
- A열 기준 정렬 후 쿠팡 정산내역 시트에 추가
- 스케줄 시트의 사업자번호와 매칭하여 O열, P열 자동 계산

### 정산/쿠팡 정산.js

**목적**: 쿠팡 당월정산 데이터를 쿠팡 정산내역으로 이동하며 자동 계산

**주요 처리**:
1. 영업자 코드로 필터링 + A열 정렬
2. 마지막 B열 값 기준으로 증분 데이터만 추가
3. A~H열 값 복사 (H열은 영업자명)
4. L~P열 자동 계산:
   - L = 영업자.C열 - O열
   - M = 영업자.D열
   - N = 영업자.E열
   - O = 스케줄에 사업자번호 있으면 영업자.F열
   - P = 스케줄 사업자번호 매칭 시 스케줄.C열 값
5. K열에 `=SUM(L:O)` 수식 자동 삽입

### 정산/배민 정산.js

**목적**: 기존체계/신규체계 데이터를 배민 정산내역으로 통합

**주요 처리**:
1. 기존체계 A2:H → 배민 당월정산 3행부터
2. 신규체계 A2:E + L2:L → 배민 당월정산 (F, G는 빈칸)
3. A열 기준 중복 제거하며 E~H열 합산
4. 배민 정산내역 B열과 중복되지 않는 데이터만 B~E열로 전송
5. F, G열에 영업자 시트 VLOOKUP 값 자동 입력

## 일반적인 작업 패턴

### 새로운 트리거 함수 추가

```javascript
function onEdit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 동시 실행 방지

    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const col = e.range.getColumn();

    // 헤더명으로 열 인덱스 가져오기
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colIdx = (name) => {
      const idx = headers.indexOf(name);
      return idx === -1 ? -1 : idx + 1;
    };

    // 비즈니스 로직...

  } catch (err) {
    Logger.log("오류: " + err);
  } finally {
    lock.releaseLock();
  }
}
```

### 시트 간 데이터 전송 패턴

```javascript
// 1. 대상 스프레드시트 ID 가져오기
const docSheet = ss.getSheetByName("문서ID");
const docData = docSheet.getDataRange().getValues();
let targetId = null;
for (let i = 1; i < docData.length; i++) {
  if (docData[i][0] === "대상문서명") {
    targetId = docData[i][2]; // C열
    break;
  }
}

// 2. 대상 시트 열기
const targetSS = SpreadsheetApp.openById(targetId);
const targetSheet = targetSS.getSheetByName("시트명");

// 3. 헤더 매핑하여 데이터 전송
const targetHeaders = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
const targetRow = [];
for (let i = 0; i < targetHeaders.length; i++) {
  targetRow[i] = data[targetHeaders[i]] || "";
}
targetSheet.appendRow(targetRow);
```

### 동적 메뉴 생성 패턴

```javascript
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ownerSheet = ss.getSheetByName("영업자");

  // 영업자명 동적 로드
  const ownerNames = ownerSheet.getRange(4, 2, ownerSheet.getLastRow() - 3, 1)
    .getValues().flat().filter(name => name);

  // 메뉴 생성
  let menu = ui.createMenu("개인정산");
  ownerNames.forEach(name => {
    menu.addItem(name, `showPersonalSettlement_${name}`);
  });
  menu.addToUi();
}
```

## 코딩 규칙 (프로젝트 전체 적용)

### 필수 사항

1. **헤더명 기반 동적 참조**: 열 번호 하드코딩 금지, 헤더명으로 인덱스 조회
2. **Lock 사용**: 트리거 함수는 반드시 `LockService`로 동시 실행 방지
3. **에러 핸들링**: try-catch + Logger.log로 디버깅 정보 기록
4. **한글 주석**: 모든 주요 로직에 한글 주석 필수
5. **타임존**: `Asia/Seoul` 고정 (appsscript.json)

### 금지 사항

- 헤더 행(1행) 수정/삭제
- 하드코딩된 열 번호 사용 (예: `getRange(row, 4)` 대신 `getRange(row, colIdx("영업자"))`)
- Lock 없이 onEdit 트리거 사용
- 문서ID/영업자 시트 구조 변경

## 디버깅 및 로그 확인

Apps Script 편집기 → 실행 로그(Ctrl+Enter) 또는 `Logger.log()` 사용

**주요 로그 확인 지점**:
- Lock 획득/해제 여부
- 대상 시트/문서 ID 조회 결과
- 데이터 전송 전 targetRow 값
- 이벤트 생성 성공/실패

## PRD 및 Task 문서

- `prd.md`: 인허가정보 모듈의 요구사항 정의서
- `task.md`: 인허가정보 모듈의 실행 계획 체크리스트

인허가정보 모듈 개발 시 두 문서를 참고하여 요구사항 준수
