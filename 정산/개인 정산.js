function createPersonalSheetByName(selectedName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  if (!selectedName) return;

  const ownerSheet = ss.getSheetByName("영업자");
  const sourceSheet = ss.getSheetByName("개인정산시트_원본");
  if (!ownerSheet || !sourceSheet) {
    ui.alert("영업자 시트 또는 개인정산시트_원본 시트를 찾을 수 없습니다.");
    return;
  }

  const response = ui.alert(
    `"${selectedName}"의 개인 정산 시트를 만드시겠습니까?`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response !== ui.Button.OK) {
    ui.alert("작업이 취소되었습니다.");
    return;
  }

  // 이미 시트가 있으면 삭제
  const exist = ss.getSheetByName(selectedName);
  if (exist) ss.deleteSheet(exist);

  // 시트 복사 및 이름 변경
  const newSheet = sourceSheet.copyTo(ss).setName(selectedName);

  // 데이터 소스 시트명을 '쿠팡 당월정산'으로 고정
  const execSheetName = '쿠팡 당월정산';

  // B13에 수식 입력
  const formula = `=SORT(FILTER('${execSheetName}'!A:U, '${execSheetName}'!P:P="${selectedName}"), 1, TRUE)`;
  newSheet.getRange("B13").setFormula(formula);

  // 배민 당월정산 시트의 A2:J 데이터 중 D열 값이 selectedName과 같은 행만 → 생성된 시트 Z12부터 붙여넣기
  const baeminSheet = ss.getSheetByName("배민 당월정산");
  if (baeminSheet) {
    const lastRow = baeminSheet.getLastRow();
    if (lastRow >= 2) {
      const baeminData = baeminSheet.getRange(2, 1, lastRow - 1, 10).getValues();
      const filtered = baeminData.filter(row => row[3] === selectedName); // D열(4번째, index 3)
      if (filtered.length > 0) {
        newSheet.getRange(13, 26, filtered.length, 10).setValues(filtered); // Z=26
      }
    }
  }

  ui.alert("완료되었습니다.");
}
