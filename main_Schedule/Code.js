// 전역 변수로 중복 실행 방지
let isProcessing = false;

function handleEditTrigger(e) {
  Logger.log("handleEditTrigger 진입, e: " + JSON.stringify(e));
  if (!e || !e.range) {
    Logger.log("e 또는 e.range가 없음, 종료");
    return;
  }
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const sheetName = sheet.getName();
  Logger.log("시트명: " + sheetName + ", 행: " + row + ", 열: " + col);
  // 중복 실행 방지
  if (isProcessing) {
    Logger.log("이미 처리 중, 중복 실행 방지");
    return;
  }

  if (sheetName !== "스케줄") return;
  if (row === 1) return; // 헤더 무시
  if (col !== 4) return; // D열(4)만 허용

  isProcessing = true;
  try {
    Logger.log("onEdit 시작");
    const oldValue = e.oldValue;
    const newValue = e.value;
    if (oldValue === newValue || (oldValue == null && newValue == null)) {
      Logger.log("값이 변경되지 않음, 종료");
      return;
    }
    const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    let newOwner = data[3];
    const existingEventId = data[27];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const docSheet = ss.getSheetByName("문서ID");
    if (!docSheet) return;
    const docData = docSheet.getDataRange().getValues();
    if (existingEventId && existingEventId !== "") {
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        '영업자 변경 확인',
        '⭐️ 영업자를 ' + newOwner + '님으로 변경 하시고\n\n캘린더를 업데이트 하시겠습니까?',
        ui.ButtonSet.YES_NO
      );
      if (response === ui.Button.NO) return;
      const prevOwner = oldValue;
      let prevCalendarId = null;
      for (let i = 1; i < docData.length; i++) {
        if (!docData[i][1] || docData[i][1] === "주인") continue;
        if (docData[i][1] === prevOwner) {
          prevCalendarId = docData[i][4];
          break;
        }
      }
      if (prevCalendarId) {
        try {
          const prevCalendar = CalendarApp.getCalendarById(prevCalendarId);
          const existingEvent = prevCalendar.getEventById(existingEventId);
          if (existingEvent) existingEvent.deleteEvent();
        } catch (deleteError) {
          Logger.log("기존 영업자 캘린더에서 이벤트 삭제 중 오류: " + deleteError);
        }
      }
    }
    let calendarId = null;
    for (let i = 1; i < docData.length; i++) {
      if (!docData[i][1] || docData[i][1] === "주인") continue;
      if (docData[i][1] === data[3]) {
        calendarId = docData[i][4];
        break;
      }
    }
    if (!calendarId) return;
    const eventTitle = data[7];
    const eventDate = new Date(data[11]);
    const tmDateObj = new Date(data[1]);
    const tmDateStr = tmDateObj.getFullYear().toString().slice(2) + '.' +
      String(tmDateObj.getMonth() + 1).padStart(2, '0') + '.' +
      String(tmDateObj.getDate()).padStart(2, '0');
    const eventDesc =
      "상세주소 : " + data[10] + "\n" +
      "사업자번호 : " + data[9] + "\n" +
      "전화번호 : " + data[12] + "\n" +
      "TM 날자 : " + tmDateStr;
    const calendar = CalendarApp.getCalendarById(calendarId);
    const event = calendar.createAllDayEvent(eventTitle, eventDate, {
      description: eventDesc,
    });
    const statusMessage = existingEventId && existingEventId !== "" ? "🔄변경완료_" + newOwner : "✅캘린더등록";
    sheet.getRange(row, 27).setValue(statusMessage);
    sheet.getRange(row, 28).setValue(event.getId());
  } catch (err) {
    Logger.log("오류 발생: " + err);
  } finally {
    isProcessing = false;
  }
}

