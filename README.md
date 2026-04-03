# Dodobox
[AbuseIPDB](https://www.abuseipdb.com/) API 스코어 조회

### Frontend (React)
- [x] IP 주소 추출(정규식) 및 유효성 검증
- [x] 5개씩 병렬 처리
- [x] 어뷰즈 스코어 색상 구분 (낮음/중간/높음)
- [x] 국내 IP 행 음영 처리
- [x] 검색창/버튼 영역 상단 고정 (sticky)
- [x] 현재 공인 IP 표시

### Backend (Go)
- [x] 인메모리 캐시 활용한 사용량 개선
- [x] 공인 IP 조회 엔드포인트 (`GET /myip`)
