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
      if (!docData[i][1] || docData[i][1] === "주인") continue; // 이름 없거나 헤더면 skip
      Logger.log(
        "문서ID 시트 " +
          i +
          "행 B열: " +
          docData[i][1] +
          ", 현재행 D열: " +
          data[3]
      );
      if (docData[i][1] === data[3]) {
        calendarId = docData[i][4];
        Logger.log("캘린더ID 찾음: " + calendarId);
        break;
      }
    }
    if (!calendarId) {
      Logger.log("캘린더ID 없음, 종료");
      return;
    }

    // 아래 인덱스는 시트 구조에 맞게 수정 필요!
    // 예시: data[8] = 가게명(제목), data[1] = 방문일자(날짜), data[10] = 상세주소 등
    const eventTitle = data[7]; // TODO: 이벤트 제목으로 쓸 값의 인덱스로 수정 (예: 가게명)
    const eventDate = new Date(data[11]); // TODO: 이벤트 날짜로 쓸 값의 인덱스로 수정 (예: 방문일자)
    Logger.log("이벤트 제목: " + eventTitle + ", 날짜: " + eventDate);
    // TM 날짜 포맷 변환 (예: 25.07.12)
    const tmDateObj = new Date(data[1]);
    const tmDateStr = tmDateObj.getFullYear().toString().slice(2) + '.' +
      String(tmDateObj.getMonth() + 1).padStart(2, '0') + '.' +
      String(tmDateObj.getDate()).padStart(2, '0');

    const eventDesc =
      "상세주소 : " + data[10] + "\n" +
      "사업자번호 : " + data[9] + "\n" +
      "전화번호 : " + data[12] + "\n" +
      "TM 날자 : " + tmDateStr;
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
