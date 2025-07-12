// 전역 변수로 중복 실행 방지
let isProcessing = false;

function onEdit(e) {
  try {
    // 중복 실행 방지
    if (isProcessing) {
      Logger.log("이미 처리 중, 중복 실행 방지");
      return;
    }
    
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
    
    // 수정 전 값과 현재 값 비교 (중복 실행 방지)
    const oldValue = e.oldValue;
    const newValue = e.value;
    Logger.log("수정 전 값: " + oldValue + ", 수정 후 값: " + newValue);
    
    // 값이 실제로 변경되지 않았거나, 둘 다 null/undefined이면 종료
    if (oldValue === newValue || (oldValue === null && newValue === null) || (oldValue === undefined && newValue === undefined)) {
      Logger.log("값이 변경되지 않음, 종료");
      return;
    }
    
    // 처리 시작 표시
    isProcessing = true;
    
    Logger.log("D열 수정 감지, 데이터 읽기 시작");

    const data = sheet
      .getRange(row, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    Logger.log("현재 행 데이터: " + JSON.stringify(data));
    
    // 바뀔 영업자 이름을 함수 상단에서 선언
    let newOwner = data[3];

    // AB열(28번째 열)에 기존 고유ID가 있는지 확인
    const existingEventId = data[27]; // AB열은 28번째 열이므로 인덱스 27
    Logger.log("기존 고유ID 확인: " + existingEventId);
    
    // 문서ID 시트 데이터 미리 읽기
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const docSheet = ss.getSheetByName("문서ID");
    if (!docSheet) {
      Logger.log("문서ID 시트 없음, 종료");
      return;
    }
    Logger.log("문서ID 시트 찾음");
    const docData = docSheet.getDataRange().getValues();
    Logger.log("문서ID 시트 데이터: " + JSON.stringify(docData));

    if (existingEventId && existingEventId !== "") {
      Logger.log("기존 고유ID 발견, 사용자 확인 필요");
      
      // 사용자에게 확인 요청 (이름 강조, 이모지, 줄바꿈)
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        '영업자 변경 확인',
        '⭐️ 영업자를 ' + newOwner + '님으로 변경 하시고\n\n캘린더를 업데이트 하시겠습니까?',
        ui.ButtonSet.YES_NO
      );
      
      if (response === ui.Button.NO) {
        Logger.log("사용자가 취소 선택, 작업 중단");
        return;
      }
      
      Logger.log("사용자가 수락 선택, 기존 이벤트 삭제 시작");
      
      // 기존 영업자 이름
      const prevOwner = e.oldValue;
      // 문서ID 시트에서 기존 영업자의 캘린더ID 찾기
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
          if (existingEvent) {
            existingEvent.deleteEvent();
            Logger.log("기존 영업자 캘린더에서 이벤트 삭제 완료: " + existingEventId);
          } else {
            Logger.log("기존 영업자 캘린더에서 이벤트를 찾을 수 없음: " + existingEventId);
          }
        } catch (deleteError) {
          Logger.log("기존 영업자 캘린더에서 이벤트 삭제 중 오류: " + deleteError);
        }
      } else {
        Logger.log("기존 영업자의 캘린더ID를 찾을 수 없음: " + prevOwner);
      }
    }

    // (이하 기존 코드: 새 영업자 캘린더ID 찾기 및 이벤트 생성)
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

    // 기존 고유ID가 있었으면 "🔄변경완료_XXX", 없었으면 "✅캘린더등록"
    const statusMessage = existingEventId && existingEventId !== "" ? "🔄변경완료_" + newOwner : "✅캘린더등록";
    sheet.getRange(row, 27).setValue(statusMessage);
    Logger.log("AA열(전송상태) 기록 완료: " + statusMessage);
    sheet.getRange(row, 28).setValue(event.getId());
    Logger.log("AB열(고유ID) 기록 완료");
    Logger.log("이벤트 등록 및 시트 기록 전체 완료");
    
    // 처리 완료 표시
    isProcessing = false;
  } catch (err) {
    Logger.log("오류 발생: " + err);
    isProcessing = false;
  }
}

