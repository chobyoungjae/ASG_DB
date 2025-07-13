function onEdit(e) {
  const sheet = e.range.getSheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // B1 개인 정산만 동작
  if (e.range.getA1Notation() === "B1") {
    const selectedName = e.value;
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

    // 실행 시트명
    const execSheetName = sheet.getName();

    // B13에 수식 입력
    const formula = `=SORT(FILTER('${execSheetName}'!A:U, '${execSheetName}'!P:P="${selectedName}"), 1, TRUE)`;
    newSheet.getRange("B13").setFormula(formula);

    ui.alert("완료되었습니다.");
  }
}