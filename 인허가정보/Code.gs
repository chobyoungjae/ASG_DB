// ============================================
// 🔧 설정 영역 - 반드시 수정하세요!
// ============================================

// 스프레드시트 ID (URL에서 복사)
// 예: https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9/edit
// → SPREADSHEET_ID = "1A2B3C4D5E6F7G8H9"
const SPREADSHEET_ID = "1lmNzFALialxHrHWCF3w5ABr6M1y2kZKLgljQmqWpNAI";

// 시트명
const SHEET_NAME = "I2500_업소";

// 식약처 API 설정
const API_BASE_URL = "http://openapi.foodsafetykorea.go.kr/api";
const SERVICE_NAME = "I2500";
const DATA_TYPE = "json";
const FETCH_SIZE = 10; // 한 번에 가져올 데이터 개수 (최대 1000)
const MAX_PAGES = 1; // 최대 페이지 수 (1 = 10건) - 테스트 후 늘리세요

// 비즈노 API 설정
const BIZNO_API_URL = "https://bizno.net/api/fapi";
const BIZNO_DAILY_LIMIT = 200; // 1일 최대 조회 건수

// API 필터 설정 (선택사항 - 필요시 주석 해제 후 값 입력)
const FILTERS = {
  // LCNS_NO: "",           // 인허가번호
  // INDUTY_CD_NM: "",      // 업종 (예: "도축업")
  // BSSH_NM: "",           // 업소명
  // CHNG_DT: "20250101"    // 최종수정일자 (YYYYMMDD)
};

// 주소 필터 (로컬 필터링 - API 수집 후 적용)
const ADDRESS_FILTER = ""; // 예: "경기도", "여주", "서울특별시" 등
                           // 빈 문자열("")이면 필터링 안함 (전체 데이터 표시)

// ============================================
// 📋 메인 함수
// ============================================

/**
 * 초기 설정 함수
 * - 스프레드시트 헤더 생성
 * - 커스텀 메뉴 추가
 * - 트리거 설정
 *
 * 최초 1회 실행 필요!
 */
function setup() {
  try {
    Logger.log("=== 초기 설정 시작 ===");

    // API 키 확인
    const apiKey = PropertiesService.getScriptProperties().getProperty("FOOD_SAFETY_API_KEY");
    if (!apiKey) {
      throw new Error("API 키가 설정되지 않았습니다. Script Properties에 FOOD_SAFETY_API_KEY를 추가하세요.");
    }

    // 스프레드시트 열기
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // 시트가 없으면 생성
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      Logger.log(`시트 생성: ${SHEET_NAME}`);
    }

    // 헤더 설정
    setupHeaders(sheet);

    // 메뉴 추가
    createMenu();

    // 트리거 설정
    setupDailyTrigger();

    SpreadsheetApp.getUi().alert("✅ 초기 설정이 완료되었습니다!\n\n메뉴에서 '지금 가져오기'를 실행하여 데이터를 수집할 수 있습니다.");
    Logger.log("=== 초기 설정 완료 ===");

  } catch (error) {
    Logger.log("❌ 설정 오류: " + error.toString());
    SpreadsheetApp.getUi().alert("❌ 설정 오류:\n" + error.toString());
  }
}

/**
 * 헤더 행 설정
 */
function setupHeaders(sheet) {
  // 1행: 메타 정보
  sheet.getRange(1, 1, 1, 11).merge();
  sheet.getRange(1, 1).setValue("최종 실행: 미실행");

  // 2행: 컬럼 헤더
  const headers = [
    "no",
    "인허가번호",
    "업종",
    "업소명",
    "대표자명",
    "전화번호",
    "허가일자",
    "주소",
    "사업자번호",       // I열 - 비즈노 API
    "법인번호",         // J열 - 비즈노 API
    "사업자상태"        // K열 - 비즈노 API
  ];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);

  // 헤더 스타일 적용
  sheet.getRange(2, 1, 1, headers.length)
    .setBackground("#4285F4")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // 열 너비 자동 조정
  sheet.setColumnWidth(1, 60);   // no
  sheet.setColumnWidth(2, 150);  // 인허가번호
  sheet.setColumnWidth(3, 120);  // 업종
  sheet.setColumnWidth(4, 200);  // 업소명
  sheet.setColumnWidth(5, 100);  // 대표자명
  sheet.setColumnWidth(6, 120);  // 전화번호
  sheet.setColumnWidth(7, 100);  // 허가일자
  sheet.setColumnWidth(8, 400);  // 주소
  sheet.setColumnWidth(9, 130);  // 사업자번호
  sheet.setColumnWidth(10, 130); // 법인번호
  sheet.setColumnWidth(11, 100); // 사업자상태

  // 1~2행 고정
  sheet.setFrozenRows(2);

  Logger.log("헤더 설정 완료");
}

/**
 * 커스텀 메뉴 생성
 */
function createMenu() {
  SpreadsheetApp.getUi()
    .createMenu("I2500 수집")
    .addItem("지금 가져오기", "fetchDataNow")
    .addItem("사업자번호 조회", "fetchBusinessNumbers")
    .addSeparator()
    .addItem("8시 트리거 재설치", "setupDailyTrigger")
    .addToUi();

  Logger.log("메뉴 생성 완료");
}

/**
 * 스프레드시트 열릴 때 메뉴 추가
 */
function onOpen() {
  createMenu();
}

/**
 * 매일 오전 8시 트리거 설정
 */
function setupDailyTrigger() {
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "fetchDataDaily") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 새 트리거 생성 (매일 오전 8시)
  ScriptApp.newTrigger("fetchDataDaily")
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  Logger.log("트리거 설정 완료: 매일 오전 8시 실행");

  if (SpreadsheetApp.getUi()) {
    SpreadsheetApp.getUi().alert("✅ 매일 오전 8시 자동 실행 트리거가 설정되었습니다!");
  }
}

// ============================================
// 🔄 데이터 수집 함수
// ============================================

/**
 * 트리거에서 호출되는 함수 (매일 오전 8시)
 */
function fetchDataDaily() {
  fetchDataNow();
}

/**
 * 수동 실행 함수 (메뉴에서 실행)
 */
function fetchDataNow() {
  try {
    Logger.log("=== 데이터 수집 시작 ===");

    // API 키 가져오기
    const apiKey = PropertiesService.getScriptProperties().getProperty("FOOD_SAFETY_API_KEY");
    if (!apiKey) {
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    // 스프레드시트 열기
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`시트를 찾을 수 없습니다: ${SHEET_NAME}`);
    }

    // 기존 데이터 삭제 (3행부터)
    const lastRow = sheet.getLastRow();
    if (lastRow >= 3) {
      sheet.getRange(3, 1, lastRow - 2, 11).clearContent();
    }

    // 데이터 수집
    const allData = [];
    let startIdx = 1;
    let hasMoreData = true;
    let totalCount = 0;
    let pageCount = 0; // 페이지 카운터 추가

    while (hasMoreData && pageCount < MAX_PAGES) {
      const endIdx = startIdx + FETCH_SIZE - 1;
      Logger.log(`데이터 요청 (페이지 ${pageCount + 1}/${MAX_PAGES}): ${startIdx} ~ ${endIdx}`);

      const result = fetchDataFromAPI(apiKey, startIdx, endIdx);

      if (result.success && result.data.length > 0) {
        allData.push(...result.data);
        totalCount += result.data.length;
        pageCount++; // 페이지 카운터 증가

        // 다음 페이지 확인
        if (result.data.length < FETCH_SIZE) {
          hasMoreData = false; // 마지막 페이지
        } else {
          startIdx = endIdx + 1;
          Utilities.sleep(500); // API 호출 간격 (0.5초)
        }
      } else {
        hasMoreData = false;
      }
    }

    // 페이지 제한으로 중단된 경우 로그
    if (pageCount >= MAX_PAGES) {
      Logger.log(`⚠️ 최대 페이지 수(${MAX_PAGES})에 도달하여 수집 중단. 더 많은 데이터를 원하면 MAX_PAGES 값을 증가시키세요.`);
    }

    // 주소 필터링 적용
    let filteredData = allData;
    if (ADDRESS_FILTER && ADDRESS_FILTER.trim() !== "") {
      filteredData = allData.filter(item => {
        const addr = item.ADDR || "";
        return addr.includes(ADDRESS_FILTER);
      });
      Logger.log(`주소 필터링: ${allData.length}건 → ${filteredData.length}건 (필터: "${ADDRESS_FILTER}")`);
    }

    // 데이터 저장
    if (filteredData.length > 0) {
      saveDataToSheet(sheet, filteredData);
      Logger.log(`총 ${filteredData.length}건 데이터 저장 완료`);
    } else {
      Logger.log("수집된 데이터가 없습니다.");
    }

    // 메타 정보 업데이트
    const now = new Date();
    const timestamp = Utilities.formatDate(now, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    const filterInfo = ADDRESS_FILTER ? ` / 필터: ${ADDRESS_FILTER}` : "";
    sheet.getRange(1, 1).setValue(`최종 실행: ${timestamp} (총 ${filteredData.length}건${filterInfo})`);

    Logger.log("=== 데이터 수집 완료 ===");

    if (SpreadsheetApp.getUi()) {
      const filterMsg = ADDRESS_FILTER ? `\n필터: ${ADDRESS_FILTER}` : "";
      SpreadsheetApp.getUi().alert(`✅ 데이터 수집 완료!\n\n총 ${filteredData.length}건의 데이터를 가져왔습니다.${filterMsg}`);
    }

  } catch (error) {
    Logger.log("❌ 수집 오류: " + error.toString());
    if (SpreadsheetApp.getUi()) {
      SpreadsheetApp.getUi().alert("❌ 수집 오류:\n" + error.toString());
    }
  }
}

/**
 * API 호출 함수
 */
function fetchDataFromAPI(apiKey, startIdx, endIdx) {
  try {
    // URL 생성
    let url = `${API_BASE_URL}/${apiKey}/${SERVICE_NAME}/${DATA_TYPE}/${startIdx}/${endIdx}`;

    // 필터 추가
    const filterParams = [];
    for (const [key, value] of Object.entries(FILTERS)) {
      if (value) {
        filterParams.push(`${key}=${encodeURIComponent(value)}`);
      }
    }
    if (filterParams.length > 0) {
      url += "/" + filterParams.join("&");
    }

    Logger.log(`API 호출: ${url}`);

    // HTTP 요청
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const content = response.getContentText();

    if (statusCode !== 200) {
      throw new Error(`API 오류 (${statusCode}): ${content}`);
    }

    // JSON 파싱
    const json = JSON.parse(content);

    // 응답 구조 확인
    if (!json[SERVICE_NAME]) {
      Logger.log("응답 데이터: " + content);
      return { success: false, data: [] };
    }

    const result = json[SERVICE_NAME];

    // RESULT 코드 확인
    if (result.RESULT && result.RESULT.CODE !== "INFO-000") {
      Logger.log(`API 결과 코드: ${result.RESULT.CODE} - ${result.RESULT.MSG}`);
      return { success: false, data: [] };
    }

    // 데이터 추출
    const rows = result.row || [];
    Logger.log(`수집된 데이터: ${rows.length}건`);

    return { success: true, data: rows };

  } catch (error) {
    Logger.log("API 호출 오류: " + error.toString());
    throw error;
  }
}

/**
 * 데이터를 시트에 저장
 */
function saveDataToSheet(sheet, data) {
  const rows = data.map((item, index) => {
    return [
      index + 1,                      // no
      item.LCNS_NO || "",            // 인허가번호
      item.INDUTY_CD_NM || "",       // 업종
      item.BSSH_NM || "",            // 업소명
      item.PRSDNT_NM || "",          // 대표자명
      item.TELNO || "",              // 전화번호
      item.PRMS_DT || "",            // 허가일자
      item.ADDR || "",               // 주소
      "",                            // 사업자번호 (나중에 조회)
      "",                            // 법인번호 (나중에 조회)
      ""                             // 사업자상태 (나중에 조회)
    ];
  });

  // 3행부터 데이터 입력
  sheet.getRange(3, 1, rows.length, 11).setValues(rows);

  Logger.log(`${rows.length}건 데이터 저장 완료`);
}

// ============================================
// 🏢 비즈노 API - 사업자번호 조회
// ============================================

/**
 * 상호명으로 사업자번호 조회 (비즈노 API)
 * @param {string} companyName - 업소명
 * @param {string} ceoName - 대표자명 (선택)
 * @returns {object} - { bno: 사업자번호, cno: 법인번호, bstt: 사업자상태 }
 */
function fetchBusinessNumber(companyName, ceoName = "") {
  try {
    // API 키 가져오기
    const biznoApiKey = PropertiesService.getScriptProperties().getProperty("BIZNO_API_KEY");
    if (!biznoApiKey) {
      Logger.log("❌ BIZNO_API_KEY가 설정되지 않았습니다.");
      return { bno: "API키 없음", cno: "", bstt: "" };
    }

    // URL 생성 (gb=3: 상호명검색)
    let url = `${BIZNO_API_URL}?key=${biznoApiKey}&gb=3&q=${encodeURIComponent(companyName)}&type=json`;

    // 대표자명 필터 추가 (선택사항)
    if (ceoName && ceoName.trim() !== "") {
      url += `&ceo=${encodeURIComponent(ceoName)}`;
    }

    Logger.log(`비즈노 API 호출: ${companyName}`);

    // HTTP 요청
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const content = response.getContentText();

    if (statusCode !== 200) {
      Logger.log(`❌ API 오류 (${statusCode}): ${content}`);
      return { bno: "조회실패", cno: "", bstt: "" };
    }

    // JSON 파싱
    const json = JSON.parse(content);

    // 디버깅: API 전체 응답 로그
    Logger.log(`[${companyName}] API 응답: ${content}`);

    // 에러 코드 확인
    if (json.resultCode !== 0) {
      Logger.log(`❌ 비즈노 에러 코드: ${json.resultCode}, 메시지: ${json.resultMsg}`);
      return { bno: json.resultMsg, cno: "", bstt: "" };
    }

    // 데이터 추출
    if (json.items && json.items.length > 0) {
      // null이 아닌 실제 데이터만 필터링
      const validItems = json.items.filter(item => item !== null && item !== undefined);

      if (validItems.length === 0) {
        Logger.log(`⚠️ 검색 결과 없음: ${companyName} (유효한 데이터 0건)`);
        return { bno: "검색결과없음", cno: "", bstt: "" };
      }

      Logger.log(`✅ 검색 결과 ${validItems.length}건 발견 (총 ${json.totalCount}건)`);

      // 우선순위: 계속사업자 > 휴업자 > 폐업자
      let selectedItem = null;

      // 1순위: 계속사업자 찾기
      for (const item of validItems) {
        if (item.bstt && item.bstt.includes("계속")) {
          selectedItem = item;
          Logger.log(`  → 계속사업자 발견: ${item.company} (${item.bno})`);
          break;
        }
      }

      // 2순위: 휴업자
      if (!selectedItem) {
        for (const item of validItems) {
          if (item.bstt && item.bstt.includes("휴업")) {
            selectedItem = item;
            Logger.log(`  → 휴업자 발견: ${item.company} (${item.bno})`);
            break;
          }
        }
      }

      // 3순위: 아무거나 (폐업자 포함)
      if (!selectedItem) {
        selectedItem = validItems[0];
        Logger.log(`  → 기본 선택: ${selectedItem.company} (${selectedItem.bno}, 상태: ${selectedItem.bstt || "정보없음"})`);
      }

      return {
        bno: selectedItem.bno || "",
        cno: selectedItem.cno || "",
        bstt: selectedItem.bstt || ""
      };
    } else {
      Logger.log(`⚠️ 검색 결과 없음: ${companyName} (items 배열 없음)`);
      return { bno: "검색결과없음", cno: "", bstt: "" };
    }

  } catch (error) {
    Logger.log(`❌ 비즈노 API 오류: ${error.toString()}`);
    return { bno: "오류", cno: "", bstt: "" };
  }
}

/**
 * 오늘 조회한 건수 확인
 */
function getTodayQueryCount() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
  const lastDate = props.getProperty("BIZNO_LAST_DATE");
  const count = parseInt(props.getProperty("BIZNO_QUERY_COUNT") || "0");

  // 날짜가 바뀌면 카운트 리셋
  if (lastDate !== today) {
    props.setProperty("BIZNO_LAST_DATE", today);
    props.setProperty("BIZNO_QUERY_COUNT", "0");
    return 0;
  }

  return count;
}

/**
 * 조회 건수 증가
 */
function incrementQueryCount() {
  const props = PropertiesService.getScriptProperties();
  const count = getTodayQueryCount();
  props.setProperty("BIZNO_QUERY_COUNT", String(count + 1));
}

/**
 * 시트의 모든 업소에 대해 사업자번호 조회
 */
function fetchBusinessNumbers() {
  try {
    Logger.log("=== 사업자번호 조회 시작 ===");

    // 스프레드시트 열기
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`시트를 찾을 수 없습니다: ${SHEET_NAME}`);
    }

    // 데이터 범위 확인 (3행부터)
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) {
      SpreadsheetApp.getUi().alert("⚠️ 조회할 데이터가 없습니다.\n먼저 '지금 가져오기'로 데이터를 수집하세요.");
      return;
    }

    // 오늘 조회 건수 확인
    const todayCount = getTodayQueryCount();
    const remainingQuota = BIZNO_DAILY_LIMIT - todayCount;

    if (remainingQuota <= 0) {
      SpreadsheetApp.getUi().alert(`⚠️ 오늘의 조회 한도(${BIZNO_DAILY_LIMIT}건)를 모두 사용했습니다.\n내일 다시 시도해주세요.`);
      return;
    }

    Logger.log(`오늘 사용 가능 건수: ${remainingQuota}/${BIZNO_DAILY_LIMIT}`);

    const dataRange = sheet.getRange(3, 1, lastRow - 2, 11);
    const data = dataRange.getValues();

    let successCount = 0;
    let failCount = 0;
    let queryCount = 0;

    // 조회가 필요한 행만 필터링
    const needQueryRows = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const companyName = row[3]; // D열: 업소명

      // 업소명이 있고 사업자번호가 없는 경우만
      if (companyName && companyName.trim() !== "" && (!row[8] || row[8].trim() === "")) {
        needQueryRows.push(i);
      }
    }

    if (needQueryRows.length === 0) {
      SpreadsheetApp.getUi().alert("ℹ️ 조회가 필요한 데이터가 없습니다.\n모든 행에 이미 사업자번호가 있습니다.");
      return;
    }

    // 한도 초과 확인
    const willQueryCount = Math.min(needQueryRows.length, remainingQuota);
    if (needQueryRows.length > remainingQuota) {
      const response = SpreadsheetApp.getUi().alert(
        `⚠️ 조회 한도 안내`,
        `조회가 필요한 데이터: ${needQueryRows.length}건\n오늘 남은 한도: ${remainingQuota}건\n\n${willQueryCount}건만 조회하시겠습니까?`,
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );

      if (response !== SpreadsheetApp.getUi().Button.YES) {
        return;
      }
    }

    // 각 행에 대해 사업자번호 조회
    for (let i = 0; i < willQueryCount; i++) {
      const rowIndex = needQueryRows[i];
      const row = data[rowIndex];
      const companyName = row[3]; // D열: 업소명
      const ceoName = row[4];     // E열: 대표자명

      // 비즈노 API 호출
      const result = fetchBusinessNumber(companyName, ceoName);

      // 결과 저장 (I, J, K열)
      data[rowIndex][8] = result.bno;   // 사업자번호
      data[rowIndex][9] = result.cno;   // 법인번호
      data[rowIndex][10] = result.bstt; // 사업자상태

      // 카운트 증가
      incrementQueryCount();
      queryCount++;

      if (result.bno && result.bno.length >= 10) {
        successCount++;
      } else {
        failCount++;
      }

      // API 호출 간격 (1초) - 무료 API 제한 고려
      Utilities.sleep(1000);

      // 진행상황 로그
      if ((i + 1) % 5 === 0) {
        Logger.log(`진행: ${i + 1}/${willQueryCount} (성공: ${successCount}, 실패: ${failCount})`);
      }
    }

    // 결과 저장
    dataRange.setValues(data);

    Logger.log("=== 사업자번호 조회 완료 ===");

    const newTodayCount = getTodayQueryCount();
    const newRemaining = BIZNO_DAILY_LIMIT - newTodayCount;

    SpreadsheetApp.getUi().alert(
      `✅ 사업자번호 조회 완료!\n\n` +
      `조회 완료: ${queryCount}건\n` +
      `성공: ${successCount}건\n` +
      `실패: ${failCount}건\n\n` +
      `오늘 사용: ${newTodayCount}/${BIZNO_DAILY_LIMIT}건\n` +
      `남은 한도: ${newRemaining}건`
    );

  } catch (error) {
    Logger.log("❌ 조회 오류: " + error.toString());
    SpreadsheetApp.getUi().alert("❌ 조회 오류:\n" + error.toString());
  }
}
