import csv
import re

def clean_address(addr):
    # 1. 불필요한 단어 제거
    addr = re.sub(r'(일부호|좌측호|일부|좌측|코너|맨|3번째)', '', addr)
    # 2. 쉼표 뒤에 숫자+호/동/층/호실 등 오면 슬래시로
    addr = re.sub(r',\s*(\d+(호|동|층|호실|실|가|관|호수|B\d+호)?)', r'/\1', addr)
    # 3. 나머지 쉼표는 공백으로
    addr = re.sub(r',', ' ', addr)
    # 4. 여러 슬래시/공백 정리
    addr = re.sub(r'/+', '/', addr)
    addr = re.sub(r'\s+', ' ', addr)
    # 5. 앞뒤 공백 정리
    addr = addr.strip()
    return addr

input_file = 'address.csv'           # 1번에서 저장한 파일명
output_file = 'address_cleaned.csv'  # 결과 파일명

with open(input_file, 'r', encoding='utf-8') as infile, \
     open(output_file, 'w', encoding='utf-8', newline='') as outfile:
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    header = next(reader)
    header.append('정제주소')  # 새 컬럼 추가
    writer.writerow(header)
    for row in reader:
        # D열(주소)이 4번째 컬럼이므로 row[3]
        if len(row) > 3:
            row.append(clean_address(row[3]))
        else:
            row.append('')
        writer.writerow(row)

print("변환 완료! address_cleaned.csv 파일을 확인하세요.")