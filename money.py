import pandas as pd

# CSV 파일 로드
df = pd.read_csv('추정매출.csv', encoding='cp949') # 한글 깨짐 방지

print(df.head())

# 데이터 요약 정보 확인
print(df.info())