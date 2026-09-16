# 후기 등록 완료 장식

`done.png` — 등록 완료 화면 가운데 놓이는 250 × 300 장식.
피그마 `/review_submitted` (3002:28867) 의 `image 124` 자리다.

- 쓰는 곳: `face-attendance-review.html` 의 `#doneView .done-img img`
- 파일이 없으면 `onerror` 로 자리째 감춘다. 화면은 깨지지 않는다.
- 권장: 세로로 긴 PNG(약 250×300 비율), 배경 투명, 긴 변 600px 이상.
