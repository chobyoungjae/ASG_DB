function handleEditTrigger(e) {
  // TM성공 시 데이터 전송 및 캘린더 등록 함수
  const sheet = e.range.getSheet();
  const col = e.range.getColumn();
  const header = sheet.getRange(1, col).getValue(); // 1행의 해당 열 값(헤더명)

  if (header !== "상태") return;
  if (e.value !== "TM성공") return;

  const targetSheetName = "[ASG] 스케줄";
  const calendarId = "r023hniibcf6hqv2i3897umvn4@group.calendar.google.com";

  // const sheet = e.range.getSheet();  <<== 이 줄 삭제!
  const row = e.range.getRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // 헤더명 → 열번호 매핑 함수 (방어 코드 추가)
  const colIdx = (name) => {
    const idx = headers.indexOf(name);
    if (idx === -1) {
      throw new Error(
        `헤더명 '${name}'을(를) 시트 1행에서 찾을 수 없습니다. 오타/띄어쓰기/공백을 확인하세요.`
      );
    }
    return idx + 1;
  };

  // 데이터 추출 함수
  const getValue = (name) => sheet.getRange(row, colIdx(name)).getValue(); // 해당 행의 헤더명에 해당하는 값 반환
  const data = {
    상호명: getValue("상호명"),
    상세주소: getValue("상세주소"),
    사업자번호: getValue("사업자번호"),
    전화번호: getValue("전화번호"),
    방문날자: getValue("방문날자"),
    "TM 날자": getValue("TM 날자"),
    "TM 담당자": getValue("TM 담당자"),
    코멘트: getValue("코멘트"),
  };
  // 문서ID 시트에서 targetSheetName과 일치하는 파일명의 스프레드시트ID 찾기
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // 현재 스프레드시트 객체
  const docSheet = ss.getSheetByName("문서ID"); // 문서ID 시트 객체
  const docData = docSheet.getDataRange().getValues(); // 문서ID 시트 전체 데이터
  let targetId = null; // 전송 대상 스프레드시트ID
  for (let i = 1; i < docData.length; i++) {
    if (docData[i][0] === targetSheetName) {
      targetId = docData[i][2];
      break;
    }
  }
  Logger.log("targetId: " + targetId);
  if (!targetId) {
    SpreadsheetApp.getUi().alert(
      "문서ID 시트에서 전송할 스프레드시트명을 찾을 수 없습니다."
    );
    return;
  }
  // 대상 스프레드시트에 데이터 전송 (헤더명 기준)
  const targetSS = SpreadsheetApp.openById(targetId); // 대상 스프레드시트 열기
  const targetSheet = targetSS.getSheetByName("스케줄"); // '스케줄' 시트 사용
  Logger.log("targetSheet: " + (targetSheet ? targetSheet.getName() : "없음"));
  if (!targetSheet) {
    SpreadsheetApp.getUi().alert(
      "대상 스프레드시트에 '스케줄' 시트가 없습니다."
    );
    return;
  }
  const targetHeaders = targetSheet
    .getRange(1, 1, 1, targetSheet.getLastColumn())
    .getValues()[0]; // 대상 시트의 헤더 배열
  // 헤더명 매핑 테이블 (시트 헤더명 → 코드 키)
  const headerMap = {
    상호명: "상호명",
    상세주소: "상세주소",
    사업자번호: "사업자번호",
    전화번호: "전화번호",
    방문날자: "방문날자",
    "TM 날자": "TM 날자",
    "TM 담당자": "TM 담당자",
    코멘트: "코멘트",
    // 필요시 추가
  };
  const targetRow = []; // 전송할 데이터 배열
  for (let i = 0; i < targetHeaders.length; i++) {
    const key = headerMap[targetHeaders[i]];
    targetRow[i] = key ? data[key] || "" : "";
  }
  Logger.log("targetRow: " + JSON.stringify(targetRow));
  Logger.log("appendRow 실행 전");

  // B열(2)~Z열(26)이 모두 빈 첫 번째 행 찾기
  let insertRow = null;
  const lastRow = targetSheet.getLastRow();
  for (let r = 2; r <= lastRow; r++) {
    // 1행은 헤더이므로 2행부터
    const rowValues = targetSheet.getRange(r, 2, 1, 25).getValues()[0]; // B~Z: 25개 열
    if (rowValues.every((v) => v === "")) {
      insertRow = r;
      break;
    }
  }

  if (insertRow) {
    // B~마지막열까지의 열 개수 계산
    const numTargetCols = targetSheet.getLastColumn() - 1; // B~마지막열
    const dataToInsert = targetRow.slice(1, 1 + numTargetCols);
    Logger.log("numTargetCols: " + numTargetCols);
    Logger.log("dataToInsert.length: " + dataToInsert.length);
    targetSheet
      .getRange(insertRow, 2, 1, numTargetCols)
      .setValues([dataToInsert]);
    Logger.log("B~마지막열 빈 행에 데이터 입력: " + insertRow);
  } else {
    targetSheet.appendRow(targetRow);
    Logger.log("appendRow 실행");
  }
  // 전송상태 기록 (원본 시트)
  if (colIdx("전송상태") > 0) {
    sheet.getRange(row, colIdx("전송상태")).setValue("전송완료");
  }
  Logger.log("appendRow 실행 후");
  Logger.log(
    "appendRow 실행 후, 마지막 행 값: " +
      JSON.stringify(
        targetSheet
          .getRange(targetSheet.getLastRow(), 1, 1, targetSheet.getLastColumn())
          .getValues()[0]
      )
  );

  /*
  // 캘린더 등록
  const calendar = CalendarApp.getCalendarById(calendarId); // 캘린더 객체 가져오기
  const eventTitle = data["상호명"]; // 일정 제목: 상호명
  const eventDate = new Date(data["방문날자"]); // 일정 날자: 방문날자
  const eventDesc = // 일정 설명: 상세주소, 사업자번호, 전화번호, TM날자 포함
    "상세주소 : " +
    data["상세주소"] +
    "\n" +
    "사업자번호 : " +
    data["사업자번호"] +
    "\n" +
    "전화번호 : " +
    data["전화번호"] +
    "\n" +
    "TM 날자 : " +
    data["TM 날자"];
  const event = calendar.createAllDayEvent(eventTitle, eventDate, {
    description: eventDesc,
  }); // 캘린더에 일정 등록
  // T열(20번째)에 고유ID 기록 (헤더명이 '고유ID'인 열)
  if (colIdx("고유ID") > 0) {
    sheet.getRange(row, colIdx("고유ID")).setValue(event.getId()); // 해당 행의 T열에 이벤트 ID 기록
  }
  // U열(21번째)에 '전송완료' 기록 (헤더명이 '전송상태'인 열)
  if (colIdx("전송상태") > 0) {
    sheet.getRange(row, colIdx("전송상태")).setValue("전송완료"); // 해당 행의 U열에 '전송완료' 기록
  }
  */
}
