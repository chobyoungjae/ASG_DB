function baeminSettlement() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("배민 당월정산"); // 고정된 시트 사용
  const oldSheet = ss.getSheetByName("기존체계");
  const newSheet = ss.getSheetByName("신규체계");
  const historySheet = ss.getSheetByName("배민 정산내역");
  const ui = SpreadsheetApp.getUi();

  // 확인/취소 버튼이 있는 알림창 추가
  const response = ui.alert(
    `${sheet.getName()}의 데이터를 배민민 정산내역 시트로 이동하시겠습니까?`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response !== ui.Button.OK) {
    ui.alert("작업이 취소되었습니다.");
    return;
  }

  if (!oldSheet || !newSheet || !historySheet) {
    ui.alert("시트 이름을 확인하세요: 기존체계, 신규체계, 배민 정산내역");
    return;
  }

  // 1. 기존체계 A2:H 데이터 → 실행시킨 시트 3행부터
  const oldData = oldSheet
    .getRange(2, 1, oldSheet.getLastRow() - 1, 8)
    .getValues();
  let targetRow = 3;
  if (oldData.length > 0) {
    sheet.getRange(targetRow, 1, oldData.length, 8).setValues(oldData);
    targetRow += oldData.length;
  }

  // 2. 신규체계 A2:E → 실행시킨 시트 A:E, L2:L → 실행시킨 시트 H, 기존 데이터 아래행부터
  const newSheetLastRow = newSheet.getLastRow();
  const newDataAtoE = newSheet
    .getRange(2, 1, newSheetLastRow - 1, 5)
    .getValues(); // A~E
  const newDataL = newSheet.getRange(2, 12, newSheetLastRow - 1, 1).getValues(); // L

  const mergedNewData = [];
  for (let i = 0; i < newDataAtoE.length; i++) {
    mergedNewData.push([
      ...newDataAtoE[i], // A~E
      "",
      "", // F, G 빈칸
      newDataL[i][0], // H
    ]);
  }

  if (mergedNewData.length > 0) {
    sheet
      .getRange(targetRow, 1, mergedNewData.length, 8)
      .setValues(mergedNewData);
    targetRow += mergedNewData.length;
  }

  // 3. 중복 제거 및 합산 (A열 기준, E~H sumif)
  let allData = sheet.getRange(3, 1, targetRow - 3, 12).getValues();
  const uniqueMap = {};
  for (let row of allData) {
    const key = row[0];
    if (!key) continue;
    if (!uniqueMap[key]) {
      uniqueMap[key] = row.slice();
    } else {
      // E(4), F(5), G(6), H(7) 합산
      for (let i = 4; i <= 7; i++) {
        uniqueMap[key][i] =
          (Number(uniqueMap[key][i]) || 0) + (Number(row[i]) || 0);
      }
    }
  }
  // 중복 제거된 데이터로 시트 갱신
  const deduped = Object.values(uniqueMap);
  sheet.getRange(3, 1, deduped.length, 12).setValues(deduped);
  // 남은 행은 지우기
  if (deduped.length < targetRow - 3) {
    sheet
      .getRange(3 + deduped.length, 1, targetRow - 3 - deduped.length, 12)
      .clearContent();
  }

  // 4. 배민 당월정산 A열과 배민 정산내역 B열의 중복되지 않은 데이터만 → 배민 정산내역 B:E로 전송
  const resultData = sheet.getRange(3, 1, deduped.length, 9).getValues();

  // 배민 정산내역 B열의 기존 데이터 가져오기 (중복 체크용)
  const historyBData = historySheet
    .getRange(1, 2, historySheet.getLastRow())
    .getValues();
  const existingBValues = new Set();

  // B열에서 실제 데이터가 있는 값들만 Set에 추가 (빈 값 제외)
  for (let row of historyBData) {
    if (row[0] && row[0] !== "" && row[0] !== null) {
      existingBValues.add(row[0]);
    }
  }

  // 배민 당월정산 A열 중에서 배민 정산내역 B열에 없는 값만 필터링
  const toHistory = resultData
    .filter((row) => row[0] && !existingBValues.has(row[0])) // A열 값이 있고, B열에 중복되지 않는 경우
    .map((row) => row.slice(0, 4)); // A~D만 선택
  if (toHistory.length > 0) {
    // B열에서 마지막 값이 있는 행 찾기
    const historyB = historySheet
      .getRange(1, 2, historySheet.getLastRow())
      .getValues();
    let lastBRow = 0;
    for (let i = historyB.length - 1; i >= 0; i--) {
      if (historyB[i][0] !== "" && historyB[i][0] !== null) {
        lastBRow = i + 1; // 1-based index
        break;
      }
    }
    const insertRow = lastBRow + 1;
    historySheet
      .getRange(insertRow, 2, toHistory.length, 4)
      .setValues(toHistory);
    // F, G열에 vlookup 수식 대신 실제 값 입력
    const ownerSheet = ss.getSheetByName("영업자");
    const ownerData = ownerSheet
      .getRange(2, 2, ownerSheet.getLastRow() - 1, 8)
      .getValues(); // B2:I
    const fgValues = [];
    for (let i = 0; i < toHistory.length; i++) {
      const searchValue = historySheet.getRange(insertRow + i, 5).getValue(); // E열 값
      const found = ownerData.find((row) => row[0] === searchValue); // row[0]은 B열
      if (found) {
        fgValues.push([found[6], found[7]]); // H, I
      } else {
        fgValues.push(["", ""]);
      }
    }
    historySheet
      .getRange(insertRow, 6, toHistory.length, 2)
      .setValues(fgValues);
  }

  ui.alert("배민 정산이 완료되었습니다!");
}
