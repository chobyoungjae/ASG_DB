function onEdit(e) {
  try {
    Logger.log("onEdit 시작");
    const sheet = e.range.getSheet();
    Logger.log("수정된 시트 이름: " + sheet.getName());
    if (sheet.getName() !== "스케줄") {
      Logger.log("스케줄 시트 아님, 종료");
      return;
    }
    const row = e.range.getRow();
    const col = e.range.getColumn();
    Logger.log("수정된 행: " + row + ", 열: " + col);
    if (col !== 4) {
      Logger.log("D열 아님, 종료");
      return;
    }
    if (row === 1) {
      Logger.log("헤더 행, 종료");
      return;
    }
    Logger.log("D열 수정 감지, 데이터 읽기 시작");

    const data = sheet
      .getRange(row, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    Logger.log("현재 행 데이터: " + JSON.stringify(data));
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const docSheet = ss.getSheetByName("문서ID");
    if (!docSheet) {
      Logger.log("문서ID 시트 없음, 종료");
      return;
    }
    Logger.log("문서ID 시트 찾음");
    const docData = docSheet.getDataRange().getValues();
    Logger.log("문서ID 시트 데이터: " + JSON.stringify(docData));

    let calendarId = null;
    for (let i = 1; i < docData.length; i++) {
      Logger.log(
        "문서ID 시트 " +
          i +
          "행 B열: " +
          docData[i][1] +
          ", 현재행 B열: " +
          data[1]
      );
      if (docData[i][1] === data[1]) {
        calendarId = docData[i][2];
        Logger.log("캘린더ID 찾음: " + calendarId);
        break;
      }
    }
    if (!calendarId) {
      Logger.log("캘린더ID 없음, 종료");
      return;
    }

    const eventTitle = data[8];
    const eventDate = new Date(data[12]);
    Logger.log("이벤트 제목: " + eventTitle + ", 날짜: " + eventDate);
    const eventDesc =
      "상세주소 : " +
      data[11] +
      "\n" +
      "사업자번호 : " +
      data[10] +
      "\n" +
      "전화번호 : " +
      data[13] +
      "\n" +
      "TM 날자 : " +
      data[2];
    Logger.log("이벤트 설명: " + eventDesc);

    const calendar = CalendarApp.getCalendarById(calendarId);
    Logger.log("캘린더 객체 생성 완료");
    const event = calendar.createAllDayEvent(eventTitle, eventDate, {
      description: eventDesc,
    });
    Logger.log("이벤트 생성 완료, ID: " + event.getId());

    sheet.getRange(row, 27).setValue("전송완료");
    Logger.log("AA열(전송상태) 기록 완료");
    sheet.getRange(row, 28).setValue(event.getId());
    Logger.log("AB열(고유ID) 기록 완료");
    Logger.log("이벤트 등록 및 시트 기록 전체 완료");
  } catch (err) {
    Logger.log("오류 발생: " + err);
  }
}
