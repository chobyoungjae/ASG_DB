// 전역 변수로 중복 실행 방지 수정완료
let isProcessing = false;

// 헤더명으로 열 인덱스를 가져오는 함수
function getColumnIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);
  return index === -1 ? null : index;
}

/**
 * 스케줄 시트의 D열(4) 값이 변경될 때 캘린더 이벤트를 생성/변경하는 트리거 함수
 * - 중복 실행 방지(lock)
 * - 값이 실제로 변경된 경우만 동작
 * - 기존 이벤트가 있으면 삭제 후 새로 생성
 * - 각 주요 분기마다 로그 추가
 */
function handleEditTrigger(e) {
  Logger.log("handleEditTrigger 진입, e: " + JSON.stringify(e));
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 최대 10초 대기
    Logger.log("Lock 획득 성공");
  } catch (ex) {
    Logger.log("Lock 획득 실패, 중복 실행 방지: " + ex);
    return;
  }
  try {
    if (!e || !e.range) {
      Logger.log("e 또는 e.range가 없음, 종료");
      return;
    }
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const col = e.range.getColumn();
    const sheetName = sheet.getName();
    Logger.log("시트명: " + sheetName + ", 행: " + row + ", 열: " + col);
    if (sheetName !== "스케줄") {
      Logger.log("스케줄 시트가 아님, 종료");
      return;
    }
    if (row === 1) {
      Logger.log("헤더 행, 종료");
      return; // 헤더 무시
    }
    const ownerColIndex = getColumnIndex(sheet, "영업자");
    if (col !== ownerColIndex + 1) {
      Logger.log("영업자 열 아님, 종료");
      return; // 영업자 열만 허용
    }

    Logger.log("onEdit 시작");
    const oldValue = e.oldValue;
    const newValue = e.value;
    Logger.log("oldValue: " + oldValue + ", newValue: " + newValue);
    Logger.log("row: " + row + ", col: " + col + ", lastColumn: " + sheet.getLastColumn());
    let data;
    try {
      data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      Logger.log("data: " + JSON.stringify(data));
    } catch (rangeErr) {
      Logger.log("getRange/getValues 에러: " + rangeErr);
      return;
    }
    const ownerIndex = getColumnIndex(sheet, "영업자");
    let newOwner = data[ownerIndex]; // 영업자
    const eventIdIndex = getColumnIndex(sheet, "고유ID");
    const existingEventId = data[eventIdIndex]; // 고유ID
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const docSheet = ss.getSheetByName("문서ID");
    if (!docSheet) {
      Logger.log("문서ID 시트 없음, 종료");
      return;
    }
    const docData = docSheet.getDataRange().getValues();
    Logger.log("문서ID 시트 데이터 로드 완료");
    // 기존 이벤트가 있으면 삭제
    if (existingEventId && existingEventId !== "") {
      Logger.log("기존 이벤트 있음, 영업자 변경 확인 알림 표시");
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        '영업자 변경 확인',
        '⭐️ 영업자를 ' + newOwner + '님으로 변경 하시고\n\n캘린더를 업데이트 하시겠습니까?',
        ui.ButtonSet.YES_NO
      );
      Logger.log("사용자 응답: " + response);
      if (response === ui.Button.NO) {
        Logger.log("사용자가 아니오 선택, 종료");
        return;
      }
      const prevOwner = oldValue;
      let prevCalendarId = null;
      // 이전 영업자의 캘린더 ID 찾기
      for (let i = 1; i < docData.length; i++) {
        if (!docData[i][1] || docData[i][1] === "주인") continue;
        if (docData[i][1] === prevOwner) {
          prevCalendarId = docData[i][4];
          break;
        }
      }
      Logger.log("이전 영업자 캘린더 ID: " + prevCalendarId);
      if (prevCalendarId) {
        try {
          const prevCalendar = CalendarApp.getCalendarById(prevCalendarId);
          const existingEvent = prevCalendar.getEventById(existingEventId);
          if (existingEvent) {
            existingEvent.deleteEvent();
            Logger.log("기존 이벤트 삭제 완료");
          } else {
            Logger.log("기존 이벤트를 찾을 수 없음");
          }
        } catch (deleteError) {
          Logger.log("기존 영업자 캘린더에서 이벤트 삭제 중 오류: " + deleteError);
        }
      }
    }
    // 새 영업자 캘린더 ID 찾기
    let calendarId = null;
    for (let i = 1; i < docData.length; i++) {
      if (!docData[i][1] || docData[i][1] === "주인") continue;
      if (docData[i][1] === data[ownerIndex]) {
        calendarId = docData[i][4];
        break;
      }
    }
    Logger.log("새 영업자 캘린더 ID: " + calendarId);
    if (!calendarId) {
      Logger.log("캘린더 ID 없음, 종료");
      return;
    }
    // 이벤트 정보 준비
    const titleIndex = getColumnIndex(sheet, "상호명");
    const visitDateIndex = getColumnIndex(sheet, "방문날자");
    const tmDateIndex = getColumnIndex(sheet, "TM 날자");
    const addressIndex = getColumnIndex(sheet, "상세주소");
    const businessNumIndex = getColumnIndex(sheet, "사업자번호");
    const phoneIndex = getColumnIndex(sheet, "전화번호");
    const commentIndex = getColumnIndex(sheet, "코멘트");
    
    const eventTitle = data[titleIndex]; // 상호명
    const eventDate = new Date(data[visitDateIndex]); // 방문날자
    const tmDateObj = new Date(data[tmDateIndex]); // TM 날자
    const tmDateStr = tmDateObj.getFullYear().toString().slice(2) + '.' +
      String(tmDateObj.getMonth() + 1).padStart(2, '0') + '.' +
      String(tmDateObj.getDate()).padStart(2, '0');
    const eventDesc =
      "상세주소 : " + data[addressIndex] + "\n" + // 상세주소
      "사업자번호 : " + data[businessNumIndex] + "\n" + // 사업자번호
      "전화번호 : " + data[phoneIndex] + "\n" + // 전화번호
      "코멘트 : " + data[commentIndex] + "\n" + // 코멘트
      "TM 날자 : " + tmDateStr;
    Logger.log("이벤트 정보 준비 완료: 제목=" + eventTitle + ", 날짜=" + eventDate);
    // 이벤트 생성
    try {
      const calendar = CalendarApp.getCalendarById(calendarId);
      const event = calendar.createAllDayEvent(eventTitle, eventDate, {
        description: eventDesc,
      });
      Logger.log("이벤트 생성 완료, ID: " + event.getId());
      const statusMessage = existingEventId && existingEventId !== "" ? "🔄변경완료_" + newOwner : "✅캘린더등록";
      const statusIndex = getColumnIndex(sheet, "전송상태");
      sheet.getRange(row, statusIndex + 1).setValue(statusMessage);
      sheet.getRange(row, eventIdIndex + 1).setValue(event.getId());
      Logger.log("시트에 상태 및 이벤트ID 기록 완료");
    } catch (eventError) {
      Logger.log("이벤트 생성 중 오류: " + eventError);
    }
  } catch (err) {
    Logger.log("오류 발생: " + err);
  } finally {
    lock.releaseLock();
    Logger.log("Lock 해제 완료");
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('데이터 업로드')
    .addItem('데이터 업로드', 'copyFilteredSortedDataToCoupangSheet_AppendAfterLast')
    .addToUi();
}

function copyFilteredSortedDataToCoupangSheet_AppendAfterLast() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentSheet = ss.getActiveSheet();
  const ownerSheet = ss.getSheetByName("영업자");
  const coupangSheet = ss.getSheetByName("쿠팡 정산내역");

  if (!ownerSheet || !coupangSheet) {
    SpreadsheetApp.getUi().alert("영업자 시트 또는 쿠팡 정산내역 시트를 찾을 수 없습니다.");
    return;
  }

  // 1. 영업자 코드 목록 가져오기
  const ownerCodes = ownerSheet.getRange("A:A").getValues().flat().filter(String);

  // 2. 현재 시트의 데이터(A~G)와 G열 값 추출 (헤더 제외)
  const lastRow = currentSheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("데이터가 없습니다.");
    return;
  }
  const data = currentSheet.getRange(2, 1, lastRow - 1, 7).getValues();

  // 3. G열 값이 영업자 코드에 있는 행만 필터
  const filtered = data.filter(row => ownerCodes.includes(row[6]));

  // 4. A열 기준 오름차순 정렬
  filtered.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });

  if (filtered.length === 0) {
    SpreadsheetApp.getUi().alert("필터링된 데이터가 없습니다.");
    return;
  }

  // 5. 쿠팡 정산내역 시트의 B열 맨 마지막 값 구하기
  const coupangB = coupangSheet.getRange("B:B").getValues().flat();
  let lastBValue = null;
  for (let i = coupangB.length - 1; i >= 0; i--) {
    if (coupangB[i]) {
      lastBValue = coupangB[i];
      break;
    }
  }

  // 6. lastBValue와 G열이 같은 행 찾기
  let startIdx = 0;
  if (lastBValue) {
    const idx = filtered.findIndex(row => String(row[6]) === String(lastBValue));
    if (idx !== -1) {
      startIdx = idx + 1; // 그 다음 행부터
    }
  }

  // 7. 복사할 데이터 추출
  const toAppend = filtered.slice(startIdx);

  if (toAppend.length === 0) {
    SpreadsheetApp.getUi().alert("추가할 새로운 데이터가 없습니다.");
    return;
  }

  // 8. 쿠팡 정산내역 시트의 맨 마지막 행 찾기
  const coupangLastRow = coupangSheet.getLastRow();
  const pasteRow = coupangLastRow + 1;

  // 9. 값으로 붙여넣기 (A~G열 전체, B열이 아니라 A열부터!)
  coupangSheet.getRange(pasteRow, 1, toAppend.length, 7).setValues(toAppend);

  SpreadsheetApp.getUi().alert("새로운 데이터가 쿠팡 정산내역 시트에 추가되었습니다.");
}

