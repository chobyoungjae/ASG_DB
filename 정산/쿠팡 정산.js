function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("정산")
    .addItem("쿠팡 정산", "copyFilteredSortedDataToCoupangSheet_AppendAfterLast")
    .addItem("배민 정산", "baeminSettlement")
    .addToUi();

  // 개인정산 메뉴 동적 생성
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ownerSheet = ss.getSheetByName("영업자");
  if (ownerSheet) {
    const lastRow = ownerSheet.getLastRow();
    // B4:B (4행~마지막행) 값만 추출
    const ownerNames = ownerSheet.getRange(4, 2, lastRow - 3, 1).getValues().flat().filter(name => name);
    let menu = ui.createMenu("개인정산");
    ownerNames.forEach(name => {
      menu.addItem(name, `showPersonalSettlement_${name}`);
    });
    menu.addToUi();
  }
}

// 각 영업자 이름별로 실행될 함수 동적 생성
function showPersonalSettlement(name) {
  createPersonalSheetByName(name);
}

// 아래는 각 이름별로 개별 함수 생성 (Google Apps Script는 동적 함수 생성이 불가하므로, 빌드 타임에 생성 필요)
// 예시로 20명까지 생성
// 실제 영업자 수에 맞게 늘릴 수 있음
function showPersonalSettlement_김태연() { showPersonalSettlement('김태연'); }
function showPersonalSettlement_김효진() { showPersonalSettlement('김효진'); }
function showPersonalSettlement_임기환() { showPersonalSettlement('임기환'); }
function showPersonalSettlement_성연수() { showPersonalSettlement('성연수'); }
function showPersonalSettlement_성유담() { showPersonalSettlement('성유담'); }
function showPersonalSettlement_김동수() { showPersonalSettlement('김동수'); }
function showPersonalSettlement_김태문() { showPersonalSettlement('김태문'); }
function showPersonalSettlement_배성일() { showPersonalSettlement('배성일'); }
function showPersonalSettlement_장제이() { showPersonalSettlement('장제이'); }
function showPersonalSettlement_송지민() { showPersonalSettlement('송지민'); }
function showPersonalSettlement_반준우() { showPersonalSettlement('반준우'); }
function showPersonalSettlement_박수혁() { showPersonalSettlement('박수혁'); }
function showPersonalSettlement_원스컴퍼니() { showPersonalSettlement('원스컴퍼니'); }
function showPersonalSettlement_안성훈() { showPersonalSettlement('안성훈'); }
function showPersonalSettlement_김강민() { showPersonalSettlement('김강민'); }
function showPersonalSettlement_김정은() { showPersonalSettlement('김정은'); }

function copyFilteredSortedDataToCoupangSheet_AppendAfterLast() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentSheet = ss.getActiveSheet();
  const currentSheetName = currentSheet.getName();
  const ownerSheet = ss.getSheetByName("영업자");
  const coupangSheet = ss.getSheetByName("쿠팡 정산내역");
  const scheduleSheet = ss.getSheetByName("스케줄");

  if (!ownerSheet || !coupangSheet) {
    SpreadsheetApp.getUi().alert(
      "영업자 시트 또는 쿠팡 정산내역 시트를 찾을 수 없습니다."
    );
    return;
  }

  // 사용자에게 확인 메시지
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    `${currentSheetName}의 데이터를 쿠팡 정산내역 시트로 이동하시겠습니까?`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response !== ui.Button.OK) {
    ui.alert("작업이 취소되었습니다.");
    return;
  }

  // 0. 스케줄 시트 J열 값 목록 가져오기
  let scheduleJValues = [];
  let scheduleJCMap = {};
  if (scheduleSheet) {
    const scheduleLastRow = scheduleSheet.getLastRow();
    if (scheduleLastRow >= 2) {
      scheduleJValues = scheduleSheet
        .getRange(2, 10, scheduleLastRow - 1, 1)
        .getValues()
        .flat()
        .map(String);
      // J열과 C열 매핑
      const scheduleJ = scheduleSheet
        .getRange(2, 10, scheduleLastRow - 1, 1)
        .getValues()
        .flat()
        .map(String);
      const scheduleC = scheduleSheet
        .getRange(2, 3, scheduleLastRow - 1, 1)
        .getValues()
        .flat()
        .map(String);
      scheduleJ.forEach((jVal, idx) => {
        scheduleJCMap[jVal] = scheduleC[idx];
      });
    }
  }

  // 1. 영업자 코드 목록(A열)과 추가정보(F열까지) 가져오기
  const ownerData = ownerSheet
    .getRange(1, 1, ownerSheet.getLastRow(), 6)
    .getValues();
  const ownerCodes = ownerData.map((row) => String(row[0]).trim());

  // 2. 현재 시트의 데이터(A~G) (헤더 제외)
  const lastRow = currentSheet.getLastRow();
  if (lastRow < 2) {
    ui.alert("데이터가 없습니다.");
    return;
  }
  const data = currentSheet.getRange(2, 1, lastRow - 1, 7).getValues();

  // 3. G열 값이 영업자 코드에 있는 행만 필터
  const filtered = data.filter((row) =>
    ownerCodes.includes(String(row[6]).trim())
  );

  // 4. A열 기준 오름차순 정렬
  filtered.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });

  if (filtered.length === 0) {
    ui.alert("필터링된 데이터가 없습니다.");
    return;
  }

  // 5. 쿠팡 정산내역 시트의 B열 "맨 아래(마지막 행)" 값 구하기
  const coupangB = coupangSheet.getRange("B:B").getValues().flat();
  let lastBValue = null;
  for (let i = coupangB.length - 1; i >= 0; i--) {
    if (coupangB[i]) {
      lastBValue = coupangB[i];
      break;
    }
  }

  // 6. filtered의 B열에서 lastBValue와 같은 값을 "위에서 아래로" 처음 찾음
  let startIdx = 0;
  if (lastBValue) {
    const idx = filtered.findIndex(
      (row) => String(row[1]).trim() === String(lastBValue).trim()
    );
    if (idx !== -1) {
      startIdx = idx + 1; // 그 다음 행부터
    }
  }

  // 7. A~G, H만 값으로 붙여넣기
  const ag_h_Data = filtered.slice(startIdx).map((row) => {
    const gValue = String(row[6]).trim();
    const ownerRow = ownerData.find((r) => String(r[0]).trim() === gValue);
    const hValue = ownerRow ? ownerRow[1] : ""; // H: 영업자명 (B열)
    return [...row, hValue];
  });

  if (ag_h_Data.length === 0) {
    ui.alert("추가할 새로운 데이터가 없습니다.");
    return;
  }

  // 8. 쿠팡 정산내역 시트의 B열에서 마지막 값이 있는 "행 번호"를 찾기
  let pasteRow = 1; // 기본값 (헤더 바로 아래)
  if (lastBValue) {
    for (let i = coupangB.length - 1; i >= 0; i--) {
      if (String(coupangB[i]).trim() === String(lastBValue).trim()) {
        pasteRow = i + 2; // 1-indexed, 다음 행
        break;
      }
    }
  }

  // 9. A~G, H열 값으로 붙여넣기 (1~8열)
  coupangSheet.getRange(pasteRow, 1, ag_h_Data.length, 8).setValues(ag_h_Data);

  // 10. L, M, N, O, P 값 계산해서 붙여넣기
  const lmnOPData = filtered.slice(startIdx).map((row, idx) => {
    const gValue = String(row[6]).trim();
    const cValue = String(row[2]).trim();
    const ownerRow = ownerData.find((r) => String(r[0]).trim() === gValue);
    // O열: 스케줄 J열 값 중에 C열 값이 "하나라도" 있으면 ownerRow[5], 아니면 ""
    let oValue = "";
    if (scheduleJValues.includes(cValue) && ownerRow) {
      oValue = ownerRow[5];
    }
    // L = ownerRow[2] - oValue
    let lValue = "";
    if (ownerRow) {
      const ownerC = Number(ownerRow[2]) || 0;
      const oNum = Number(oValue) || 0;
      lValue = ownerC - oNum;
    }
    const mValue = ownerRow ? ownerRow[3] : "";
    const nValue = ownerRow ? ownerRow[4] : "";
    // P열: 쿠팡 정산내역 C열(row[2]) 값이 스케줄 J열에 있으면, 그 J열에 해당하는 스케줄 C열 값을 넣음
    let pValue = "";
    if (scheduleJCMap[cValue]) {
      pValue = scheduleJCMap[cValue];
    }
    return [lValue, mValue, nValue, oValue, pValue];
  });
  // L열(12), M열(13), N열(14), O열(15), P열(16)
  coupangSheet.getRange(pasteRow, 12, lmnOPData.length, 5).setValues(lmnOPData);

  // 11. K열(11)에 =SUM(L:N) 수식 입력
  for (let i = 0; i < ag_h_Data.length; i++) {
    const rowNum = pasteRow + i;
    coupangSheet
      .getRange(rowNum, 11)
      .setFormula("=SUM(L" + rowNum + ":O" + rowNum + ")");
  }

  ui.alert("새로운 데이터가 쿠팡 정산내역 시트에 추가되었습니다.");
}
