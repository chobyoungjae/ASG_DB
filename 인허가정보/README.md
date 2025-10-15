# 🏢 인허가정보 자동 수집 시스템

> 식품의약품안전처 OpenAPI(I2500)와 비즈노 사업자 조회 API를 활용한 업소 정보 자동 수집 시스템

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-JavaScript-blue)](https://www.google.com/script/start/)

---

## 📑 목차

- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [시스템 요구사항](#-시스템-요구사항)
- [설치 가이드](#-설치-가이드)
- [사용 방법](#-사용-방법)
- [API 스펙](#-api-스펙)
- [데이터 구조](#-데이터-구조)
- [문제 해결](#-문제-해결)
- [개발 문서](#-개발-문서)
- [라이선스](#-라이선스)

---

## 🎯 개요

### 프로젝트 목적

식품의약품안전처의 인허가 업소 정보를 자동으로 수집하고, 비즈노 API를 통해 사업자번호 등 추가 정보를 통합하여 Google Sheets에 저장하는 자동화 시스템입니다.

### 주요 특징

- ✅ **자동 수집**: 매일 오전 8시 자동 실행
- ✅ **통합 데이터**: 식약처 + 비즈노 API 결합 (13개 컬럼)
- ✅ **무료 사용**: 공공 API + 무료 사업자 조회 (1일 200건)
- ✅ **간편 관리**: Google Sheets 기반 데이터 관리
- ✅ **보안**: API 키 안전 관리 (Script Properties)

---

## 🚀 주요 기능

### 1. 식약처 인허가 정보 수집

```
📊 제공 정보 (I2500 API)
- 인허가번호 (LCNS_NO)
- 업종 (INDUTY_CD_NM)
- 업소명 (BSSH_NM)
- 대표자명 (PRSDNT_NM)
- 전화번호 (TELNO)
- 허가일자 (PRMS_DT)
- 주소 (ADDR)
```

### 2. 사업자번호 자동 조회

```
🏢 제공 정보 (비즈노 API)
- 사업자번호 (bno)
- 법인번호 (cno)
- 사업자상태 (bstt) - 계속사업자/휴업자/폐업자
- 과세유형 (taxtype) - 일반/간이과세자 등
- 폐업일 (EndDt)
```

### 3. 스마트 데이터 매칭

- **계속사업자 우선 선택**: 같은 상호명에 여러 사업자가 있을 경우 영업 중인 업체 우선
- **중복 조회 방지**: 이미 조회된 데이터 스킵
- **1일 200건 제한 관리**: 무료 API 한도 자동 관리

---

## 💻 시스템 요구사항

### 필수 사항

- Google 계정 (Gmail)
- Google Sheets 접근 권한
- 식약처 OpenAPI 인증키 ([발급 방법](https://www.foodsafetykorea.go.kr/api/main.do))
- 비즈노 API 인증키 ([발급 방법](https://bizno.net/openapi))

### 선택 사항 (로컬 개발)

- Node.js 14+
- clasp CLI (`npm install -g @google/clasp`)
- Git

---

## 📦 설치 가이드

### Step 1: 스프레드시트 준비

1. [새 Google Sheets 생성](https://sheets.google.com)
2. 시트명을 `I2500_업소`로 변경
3. URL에서 **스프레드시트 ID** 복사
   ```
   https://docs.google.com/spreadsheets/d/{스프레드시트ID}/edit
   ```

### Step 2: Apps Script 프로젝트 생성

1. 스프레드시트에서 **확장 프로그램 → Apps Script** 클릭
2. 기본 코드 삭제
3. [Code.gs](./Code.gs) 파일 내용 전체 복사하여 붙여넣기
4. **SPREADSHEET_ID** 변수 수정 (Line 8)
   ```javascript
   const SPREADSHEET_ID = "여기에_복사한_ID_붙여넣기";
   ```

### Step 3: API 키 등록

#### 3-1. 식약처 API 키
1. Apps Script 편집기 → ⚙️ **프로젝트 설정** 클릭
2. **Script Properties** 섹션 → **속성 추가** 클릭
3. 입력:
   - **Key**: `FOOD_SAFETY_API_KEY`
   - **Value**: `발급받은_식약처_API_키`
4. **저장**

#### 3-2. 비즈노 API 키
1. 같은 방법으로 **속성 추가**
2. 입력:
   - **Key**: `BIZNO_API_KEY`
   - **Value**: `발급받은_비즈노_API_키`
3. **저장**

### Step 4: 초기 설정 실행

1. Apps Script 편집기 상단 함수 선택 → **setup** 선택
2. **실행** 버튼 (▶️) 클릭
3. **권한 검토** → **허용** 클릭
4. ✅ "초기 설정이 완료되었습니다!" 알림 확인

---

## 🎮 사용 방법

### 자동 실행 (권장)

```
매일 오전 8시 자동 실행
→ 식약처 API 데이터 수집
→ 시트 자동 업데이트
```

### 수동 실행

#### 방법 1: 메뉴에서 실행
1. 스프레드시트 상단 **I2500 수집** 메뉴 클릭
2. **지금 가져오기** 선택
3. 데이터 수집 완료 대기 (약 10-30초)

#### 방법 2: Apps Script에서 실행
1. Apps Script 편집기 열기
2. 함수 선택 → **fetchDataNow** 선택
3. **실행** 버튼 클릭

### 사업자번호 조회

```
전제 조건: 식약처 데이터가 먼저 수집되어 있어야 함
```

1. **I2500 수집** 메뉴 → **사업자번호 조회** 클릭
2. 조회 현황 확인 (남은 한도 표시)
3. 조회 완료 대기 (1초/건, 10건 = 약 10초)

### 트리거 재설정

트리거가 작동하지 않을 경우:
1. **I2500 수집** 메뉴 → **8시 트리거 재설치** 클릭
2. ✅ "매일 오전 8시 자동 실행 트리거가 설정되었습니다!" 확인

---

## 📊 데이터 구조

### 시트 레이아웃

```
┌─────────────────────────────────────────────────┐
│ Row 1: 최종 실행: 2025-10-15 08:00:00 (총 10건) │  ← 메타 정보
├─────────────────────────────────────────────────┤
│ Row 2: | no | 인허가번호 | 업종 | 업소명 | ... │  ← 헤더 (고정)
├─────────────────────────────────────────────────┤
│ Row 3~: 데이터 행                                │  ← 데이터
└─────────────────────────────────────────────────┘
```

### 컬럼 상세

| 열 | 필드명 | 타입 | 출처 | 설명 |
|----|--------|------|------|------|
| A | no | NUMBER | 자동 | 순번 (1부터 자동 증가) |
| B | 인허가번호 | STRING | 식약처 | 영업고유구분번호 |
| C | 업종 | STRING | 식약처 | 업종명 (예: 일반음식점) |
| D | 업소명 | STRING | 식약처 | 상호명 |
| E | 대표자명 | STRING | 식약처 | 대표자 이름 |
| F | 전화번호 | STRING | 식약처 | 연락처 |
| G | 허가일자 | STRING | 식약처 | YYYYMMDD 형식 |
| H | 주소 | STRING | 식약처 | 소재지 전체 주소 |
| **I** | **사업자번호** | STRING | 비즈노 | xxx-xx-xxxxx 형식 |
| **J** | **법인번호** | STRING | 비즈노 | xxxxxx-xxxxxxx 형식 |
| **K** | **사업자상태** | STRING | 비즈노 | 계속사업자/휴업자/폐업자 |
| **L** | **과세유형** | STRING | 비즈노 | 일반과세자/간이과세자 등 |
| **M** | **폐업일** | STRING | 비즈노 | YYYYMMDD 형식 |

---

## 🔧 API 스펙

### 1. 식약처 I2500 API

**엔드포인트**:
```
http://openapi.foodsafetykorea.go.kr/api/{인증키}/I2500/json/{startIdx}/{endIdx}
```

**요청 예시**:
```
http://openapi.foodsafetykorea.go.kr/api/ABC123/I2500/json/1/10
```

**응답 예시**:
```json
{
  "I2500": {
    "RESULT": {
      "CODE": "INFO-000",
      "MSG": "정상 처리되었습니다."
    },
    "row": [
      {
        "LCNS_NO": "18990056002",
        "INDUTY_CD_NM": "일반음식점",
        "BSSH_NM": "행운마차3호점",
        "PRSDNT_NM": "선**",
        "TELNO": "02-1234-5678",
        "PRMS_DT": "18991230",
        "ADDR": "서울특별시 도봉구 ..."
      }
    ]
  }
}
```

**제한 사항**:
- 1일 1,000회 호출 제한
- 한 번에 최대 1,000건 조회 가능

### 2. 비즈노 API

**엔드포인트**:
```
https://bizno.net/api/fapi
```

**요청 파라미터**:
```
key: API 인증키 (필수)
gb: 3 (상호명 검색)
q: 검색어 (업소명)
status: Y (국세청 실시간 조회)
type: json (응답 형식)
```

**요청 예시**:
```
https://bizno.net/api/fapi?key=ABC123&gb=3&q=행운마차3호점&status=Y&type=json
```

**응답 예시**:
```json
{
  "resultCode": 0,
  "resultMsg": "NORMAL SERVICE.",
  "totalCount": 1,
  "items": [
    {
      "company": "행운마차3호점",
      "bno": "127-74-00285",
      "cno": "",
      "bstt": "계속사업자",
      "taxtype": "부가가치세 일반과세자",
      "EndDt": ""
    }
  ]
}
```

**제한 사항**:
- 1일 200건 조회 제한 (무료 플랜)
- 1초당 1회 호출 권장

---

## ⚙️ 설정 옵션

### Code.gs 설정 변수 (Line 1-31)

```javascript
// 스프레드시트 ID
const SPREADSHEET_ID = "여기에_ID_입력";

// 시트명
const SHEET_NAME = "I2500_업소";

// 식약처 API 설정
const FETCH_SIZE = 10;        // 한 번에 가져올 데이터 개수 (최대 1000)
const MAX_PAGES = 1;          // 최대 페이지 수 (1 = 10건)

// 비즈노 API 설정
const BIZNO_DAILY_LIMIT = 200; // 1일 최대 조회 건수

// 주소 필터 (선택사항)
const ADDRESS_FILTER = "";    // 예: "서울특별시", "경기도" 등
```

### 권장 설정값

**테스트 환경**:
```javascript
const FETCH_SIZE = 10;
const MAX_PAGES = 1;  // 10건만 수집
```

**운영 환경**:
```javascript
const FETCH_SIZE = 100;
const MAX_PAGES = 10; // 1,000건 수집
```

---

## 🐛 문제 해결

### 자주 발생하는 문제

#### 1. "API 키가 설정되지 않았습니다" 에러

**원인**: Script Properties에 API 키 미등록

**해결**:
1. Apps Script → ⚙️ 프로젝트 설정
2. Script Properties 확인
3. `FOOD_SAFETY_API_KEY`, `BIZNO_API_KEY` 등록 확인

#### 2. "시트를 찾을 수 없습니다" 에러

**원인**: 시트명이 "I2500_업소"가 아님

**해결**:
1. 스프레드시트 하단 시트명 확인
2. "I2500_업소"로 정확히 변경

#### 3. "오늘의 조회 한도를 모두 사용했습니다" 알림

**원인**: 비즈노 API 1일 200건 제한 초과

**해결**:
- 내일까지 대기 (자정에 자동 리셋)
- 또는 유료 플랜 전환 검토

#### 4. 트리거가 실행되지 않음

**원인**: 트리거 설정 오류 또는 삭제됨

**해결**:
1. Apps Script → ⏰ 트리거 메뉴 확인
2. `fetchDataDaily` 트리거 존재 확인
3. 없으면 메뉴 → **8시 트리거 재설치** 실행

#### 5. 사업자번호 조회 실패가 많음

**원인**: 비즈노 무료 API의 데이터 커버리지 한계

**현상**: 약 80% 성공률 (정상)

**대안**:
- 실패 건은 수동으로 입력
- 또는 유료 API 전환 (100% 조회 가능)

---

## 📚 개발 문서

### 프로젝트 문서

- **[PRD 문서](./prd.md)**: 요구사항 정의서
- **[Task 문서](./task.md)**: 실행 계획 체크리스트
- **[개발 히스토리](./DEVELOPMENT_HISTORY.md)**: 전체 개발 과정 및 학습 포인트
- **[CLAUDE.md](./CLAUDE.md)**: 프로젝트 가이드 (AI 개발 지원)

### 외부 문서

- [식약처 OpenAPI 가이드](https://www.foodsafetykorea.go.kr/api/main.do)
- [비즈노 API 문서](https://bizno.net/openapi)
- [Google Apps Script 문서](https://developers.google.com/apps-script)
- [clasp 공식 문서](https://github.com/google/clasp)

---

## 🔒 보안 및 개인정보

### API 키 관리

**✅ 안전한 방법** (현재 사용):
```javascript
// Script Properties 사용
const apiKey = PropertiesService.getScriptProperties().getProperty("FOOD_SAFETY_API_KEY");
```

**❌ 위험한 방법** (절대 금지):
```javascript
// 코드에 직접 입력 (Git에 노출됨!)
const apiKey = "Iv9sGhjS20udITbvG1in2v9m";
```

### 데이터 보안

- **개인정보 마스킹**: 대표자명이 `박**` 형태로 마스킹되어 제공됨 (식약처 정책)
- **전화번호**: 일부 깨짐 현상 있음 (데이터 품질 이슈)
- **민감 정보**: 사업자번호는 공공 정보이므로 저장 가능

---

## 🚢 배포 (로컬 개발자용)

### clasp 설치 및 설정

```bash
# 1. clasp 설치
npm install -g @google/clasp

# 2. Google 계정 로그인
clasp login

# 3. 프로젝트 클론
cd 인허가정보
clasp clone <Apps Script 프로젝트 ID>

# 4. 코드 수정 후 배포
vi Code.gs
clasp push
```

### Git 워크플로우

```bash
# 1. 기능 브랜치 생성
git checkout -b feature/new-feature

# 2. 코드 수정 및 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 3. 푸시 및 PR 생성
git push origin feature/new-feature
```

---

## 📈 성능 및 제한 사항

### 처리 속도

| 작업 | 시간 |
|------|------|
| 식약처 API 10건 수집 | 약 5초 |
| 사업자번호 10건 조회 | 약 15초 (1초 간격) |
| setup() 초기 설정 | 약 3초 |

### API 제한

| API | 제한 | 비고 |
|-----|------|------|
| 식약처 I2500 | 1,000회/일 | 공공 API |
| 비즈노 무료 | 200건/일 | 무료 플랜 |

### 권장 사용량

- **일일 수집**: 100~200건 (비즈노 한도 고려)
- **월간 수집**: 6,000건 (200건 × 30일)

---

## 🤝 기여 가이드

### 버그 리포트

이슈 발생 시 다음 정보 포함:
1. 에러 메시지 전체
2. 실행 로그 (Apps Script → 실행 로그)
3. 발생 상황 설명

### 기능 제안

GitHub Issues에 다음 내용 작성:
1. 제안 배경 및 이유
2. 기대 효과
3. 구현 아이디어 (선택)

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

```
MIT License

Copyright (c) 2025 조병재

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 📞 문의

**개발자**: 조병재
**프로젝트**: ASG_DB - 인허가정보 모듈
**GitHub**: [https://github.com/chobyoungjae/ASG_DB](https://github.com/chobyoungjae/ASG_DB)

---

## 🎉 버전 히스토리

### v1.0.0 (2025-10-15)
- ✅ 식약처 I2500 API 통합
- ✅ 비즈노 사업자 조회 API 통합
- ✅ 계속사업자 우선 선택 로직
- ✅ 1일 200건 제한 관리
- ✅ 국세청 실시간 조회 (status=Y)
- ✅ 13개 컬럼 완전 구성

---

**🚀 Happy Coding!**
