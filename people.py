import pandas as pd
import matplotlib.pyplot as plt

# 1. 데이터 불러오기 및 정제 (데이터를 먼저 준비해야 함)
# 파일명은 본인의 파일명('서울시_상권분석서비스_추정매출.csv' 등)으로 꼭 확인하세요!
df_sales = pd.read_csv('추정매출.csv', encoding='cp949')

# 카페 업종만 골라내기
df_cafe = df_sales[df_sales['서비스_업종_코드_명'] == '커피-음료'].copy()

# MZ(2030) 매출 합산 지표 만들기 (이게 우리 서비스의 핵심 정제!)
df_cafe['MZ_매출_합계'] = df_cafe['연령대_20_매출_금액'] + df_cafe['연령대_30_매출_금액']

# 행정동별로 묶어서 평균 매출 순위 매기기
dong_rank = df_cafe.groupby('행정동_코드_명')['MZ_매출_합계'].mean().reset_index()

# 드디어 시각화에 쓸 'top_5_mz' 데이터 탄생!
top_5_mz = dong_rank.sort_values(by='MZ_매출_합계', ascending=False).head(5)

# --- 2. 시각화 (준비된 데이터를 그래프로 표현) ---
# 한글 깨짐 방지 설정
plt.rc('font', family='Malgun Gothic') 
plt.rcParams['axes.unicode_minus'] = False 

# 그래프에 쓸 데이터 설정
dongs = top_5_mz['행정동_코드_명']
revenues = top_5_mz['MZ_매출_합계'] / 10**8  # 단위를 '억 원'으로 보기 좋게 정제

# 그래프 그리기
plt.figure(figsize=(10, 6))
bars = plt.bar(dongs, revenues, color='#3498db', alpha=0.8)

# 그래프 제목 및 축 설정
plt.title('☕ 서울시 MZ세대 카페 매출 상위 5개 동네', fontsize=15, pad=20)
plt.ylabel('예상 매출액 (억 원)')

# 막대 위에 숫자(텍스트) 표시
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2, height, f'{height:.1f}억', ha='center', va='bottom')

plt.tight_layout()
plt.show() # 그래프 창 띄우기