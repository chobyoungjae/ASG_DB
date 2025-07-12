function handleEditTrigger(e) {
  var lock = LockService.getScriptLock();
  let sheet, row, headers, colIdx;
  try {
    lock.waitLock(30000); // 최대 30초 대기
    // TM성공 시 데이터 전송 및 캘린더 등록 함수
    sheet = e.range.getSheet();
    const col = e.range.getColumn();
    const header = sheet.getRange(1, col).getValue(); // 1행의 해당 열 값(헤더명)

    if (header !== "상태") return;
    if (e.value !== "TM성공") return;

    row = e.range.getRow();
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    colIdx = (name) => {
      const idx = headers.indexOf(name);
      return idx === -1 ? -1 : idx + 1;
    };
    const getValue = (name) => {
      const idx = colIdx(name);
      return idx === -1 ? "" : sheet.getRange(row, idx).getValue();
    };
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
    const targetSheetName = "[ASG] 스케줄";
    const calendarId = "r023hniibcf6hqv2i3897umvn4@group.calendar.google.com";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const docSheet = ss.getSheetByName("문서ID");
    const docData = docSheet.getDataRange().getValues();
    let targetId = null;
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
    const targetSS = SpreadsheetApp.openById(targetId);
    const targetSheet = targetSS.getSheetByName("스케줄");
    Logger.log("targetSheet: " + (targetSheet ? targetSheet.getName() : "없음"));
    if (!targetSheet) {
      SpreadsheetApp.getUi().alert(
        "대상 스프레드시트에 '스케줄' 시트가 없습니다."
      );
      return;
    }
    const targetHeaders = targetSheet
      .getRange(1, 1, 1, targetSheet.getLastColumn())
      .getValues()[0];
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
    const targetRow = [];
    for (let i = 0; i < targetHeaders.length; i++) {
      const key = headerMap[targetHeaders[i]];
      targetRow[i] = key ? data[key] || "" : "";
    }
    Logger.log("targetRow: " + JSON.stringify(targetRow));
    Logger.log("appendRow 실행 전");

    let sendSuccess = false;
    try {
      let insertRow = null;
      const lastRow = targetSheet.getLastRow();
      const allRows = targetSheet.getRange(2, 2, lastRow - 1, 13).getValues();
      for (let i = 0; i < allRows.length; i++) {
        if (allRows[i].every((v) => v === "")) {
          insertRow = i + 2;
          break;
        }
      }
      const NUM_B_TO_N = 13;
      if (insertRow) {
        const dataToInsert = targetRow.slice(1, 1 + NUM_B_TO_N);
        const colNames = targetHeaders.slice(1, 1 + NUM_B_TO_N);
        for (let i = 0; i < NUM_B_TO_N; i++) {
          Logger.log(`B~N 열 로그: 열=${String.fromCharCode(66 + i)} / 헤더=${colNames[i]} / 값=${dataToInsert[i]}`);
        }
        Logger.log("dataToInsert.length: " + dataToInsert.length);
        targetSheet
          .getRange(insertRow, 2, 1, NUM_B_TO_N)
          .setValues([dataToInsert]);
        Logger.log("B~N 빈 행에 데이터 입력: " + insertRow);
      } else {
        targetSheet.appendRow(targetRow);
        Logger.log("appendRow 실행");
      }
      sendSuccess = true;
    } catch (err) {
      Logger.log("전송 실패: " + err);
    }
    if (colIdx("전송상태") > 0) {
      if (sendSuccess) {
        sheet.getRange(row, colIdx("전송상태")).setValue("✅전송완료");
      } else {
        sheet.getRange(row, colIdx("전송상태")).setValue("❌전송실패");
        sheet.getRange(row, colIdx("전송상태")).setFontColor("#FF0000");
      }
    }
    Logger.log("appendRow 실행 후");
  } catch (err) {
    Logger.log("Lock 획득 실패 또는 전송 실패: " + err);
    if (sheet && row && typeof colIdx === 'function' && colIdx("전송상태") > 0) {
      sheet.getRange(row, colIdx("전송상태")).setValue("❌전송실패");
      sheet.getRange(row, colIdx("전송상태")).setFontColor("#FF0000");
    }
  } finally {
    lock.releaseLock();
  }
}
