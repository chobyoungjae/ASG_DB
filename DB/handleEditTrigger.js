// Google Sheets의 "상태" 열이 "TM성공"으로 변경될 때 실행되는 트리거 함수
function handleEditTrigger(e) {
  var lock = LockService.getScriptLock(); // 동시 실행 방지용 Lock 객체
  let sheet, row, headers, colIdx;
  try {
    lock.waitLock(30000); // 최대 30초 동안 Lock 대기
    // TM성공 시 데이터 전송 및 캘린더 등록 함수
    sheet = e.range.getSheet(); // 수정된 셀이 속한 시트 객체
    const col = e.range.getColumn(); // 수정된 셀의 열 번호
    const header = sheet.getRange(1, col).getValue(); // 1행(헤더)의 해당 열 값

    if (header !== "상태") return; // 상태 열이 아니면 종료
    if (e.value !== "TM성공") return; // 값이 TM성공이 아니면 종료

    row = e.range.getRow(); // 수정된 셀의 행 번호
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // 헤더(1행 전체)
    // 헤더명으로 열 번호 반환 함수
    colIdx = (name) => {
      const idx = headers.indexOf(name);
      return idx === -1 ? -1 : idx + 1;
    };
    // 헤더명으로 해당 행의 값 반환 함수
    const getValue = (name) => {
      const idx = colIdx(name);
      return idx === -1 ? "" : sheet.getRange(row, idx).getValue();
    };
    // 전송할 데이터 객체 생성
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
    const targetSheetName = "[ASG] 스케줄"; // 전송 대상 문서명
    const calendarId = "r023hniibcf6hqv2i3897umvn4@group.calendar.google.com"; // 캘린더 ID(미사용)
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // 현재 스프레드시트 객체
    const docSheet = ss.getSheetByName("문서ID"); // 문서ID 시트
    const docData = docSheet.getDataRange().getValues(); // 문서ID 시트 전체 데이터
    let targetId = null; // 전송 대상 문서의 ID
    // 문서ID 시트에서 대상 문서의 ID 찾기
    for (let i = 1; i < docData.length; i++) {
      if (docData[i][0] === targetSheetName) {
        targetId = docData[i][2];
        break;
      }
    }
    Logger.log("targetId: " + targetId); // 찾은 문서 ID 로그
    if (!targetId) {
      // 대상 문서 ID를 못 찾으면 경고 후 종료
      SpreadsheetApp.getUi().alert(
        "문서ID 시트에서 전송할 스프레드시트명을 찾을 수 없습니다."
      );
      return;
    }
    const targetSS = SpreadsheetApp.openById(targetId); // 대상 스프레드시트 열기
    const targetSheet = targetSS.getSheetByName("스케줄"); // 대상 시트(스케줄)
    Logger.log(
      "targetSheet: " + (targetSheet ? targetSheet.getName() : "없음")
    );
    if (!targetSheet) {
      // 대상 시트가 없으면 경고 후 종료
      SpreadsheetApp.getUi().alert(
        "대상 스프레드시트에 '스케줄' 시트가 없습니다."
      );
      return;
    }
    // 대상 시트의 헤더(1행 전체)
    const targetHeaders = targetSheet
      .getRange(1, 1, 1, targetSheet.getLastColumn())
      .getValues()[0];
    // 헤더 매핑(동일명)
    const headerMap = {
      상호명: "상호명",
      상세주소: "상세주소",
      사업자번호: "사업자번호",
      전화번호: "전화번호",
      방문날자: "방문날자",
      "TM 날자": "TM 날자",
      "TM 담당자": "TM 담당자",
      코멘트: "코멘트",
    };
    // 대상 시트에 맞는 데이터 배열 생성
    const targetRow = [];
    for (let i = 0; i < targetHeaders.length; i++) {
      const key = headerMap[targetHeaders[i]];
      targetRow[i] = key ? data[key] || "" : "";
    }
    Logger.log("targetRow: " + JSON.stringify(targetRow)); // 전송 데이터 로그
    Logger.log("appendRow 실행 전");

    let sendSuccess = false; // 전송 성공 여부
    try {
      let insertRow = null; // 빈 행 위치
      const lastRow = targetSheet.getLastRow(); // 마지막 데이터 행
      // B~Z(2~26)열의 모든 데이터(2행~마지막행)
      const allRows = targetSheet.getRange(2, 2, lastRow - 1, 25).getValues();
      // 빈 행(B~Z 모두 빈 값) 찾기
      for (let i = 0; i < allRows.length; i++) {
        if (allRows[i].every((v) => v === "")) {
          insertRow = i + 2;
          break;
        }
      }
      const NUM_B_TO_Z = 25; // B~Z 열 개수
      if (insertRow) {
        // 실제로 값이 있는 헤더(열) 개수 구하기
        const validHeaders = targetHeaders
          .slice(1, 26)
          .filter((h) => h !== undefined && h !== "");
        const actualColCount = validHeaders.length;
        const dataToInsert = targetRow.slice(1, 1 + actualColCount);
        const colNames = targetHeaders.slice(1, 1 + actualColCount);
        for (let i = 0; i < actualColCount; i++) {
          Logger.log(
            `B~Z 열 로그: 열=${String.fromCharCode(66 + i)} / 헤더=${
              colNames[i]
            } / 값=${dataToInsert[i]}`
          );
        }
        Logger.log("dataToInsert.length: " + dataToInsert.length);
        targetSheet
          .getRange(insertRow, 2, 1, actualColCount)
          .setValues([dataToInsert]);
        Logger.log("B~Z 빈 행에 데이터 입력: " + insertRow);
      } else {
        // 빈 행이 없으면 맨 아래에 추가
        targetSheet.appendRow(targetRow);
        Logger.log("appendRow 실행");
      }
      sendSuccess = true; // 전송 성공
    } catch (err) {
      Logger.log("전송 실패: " + err); // 전송 실패 로그
    }
    // 전송상태 열이 있으면 결과 기록
    if (colIdx("전송상태") > 0) {
      if (sendSuccess) {
        sheet.getRange(row, colIdx("전송상태")).setValue("✅전송완료"); // 성공 표시
      } else {
        sheet.getRange(row, colIdx("전송상태")).setValue("❌전송실패"); // 실패 표시
        sheet.getRange(row, colIdx("전송상태")).setFontColor("#FF0000"); // 빨간색
      }
    }
    Logger.log("appendRow 실행 후");
  } catch (err) {
    Logger.log("Lock 획득 실패 또는 전송 실패: " + err); // Lock 실패 또는 예외 발생
    // 전송상태 열이 있으면 실패 표시
    if (
      sheet &&
      row &&
      typeof colIdx === "function" &&
      colIdx("전송상태") > 0
    ) {
      sheet.getRange(row, colIdx("전송상태")).setValue("❌전송실패");
      sheet.getRange(row, colIdx("전송상태")).setFontColor("#FF0000");
    }
  } finally {
    lock.releaseLock(); // Lock 해제
  }
}
