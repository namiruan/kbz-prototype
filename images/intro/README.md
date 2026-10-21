# 소개페이지 사진

`card-reader.html`(퇴직공제 전자카드 단말기)과 `face-attendance.html`(안면인식
출퇴근관리 단말기)이 쓰는 사진입니다. **같은 파일명으로 덮어쓰면** 바로 반영됩니다.

## 제품컷 — `device/`

이 저장소에 이미 있던 사진을 소개페이지 틀에 맞게 잘라 둔 것입니다. 원본은
`images/card-reader/` · `images/face-reader/` · `images/device/` 에 그대로 있습니다.

| 파일 | 무엇 | 원본 |
| --- | --- | --- |
| `wall.png` · `portable.png` · `mobile.png` | 전자카드 단말기 벽부형·이동형·휴대형 | `images/card-reader/` |
| `card-reader-3.png` | 위 셋을 바닥 맞춰 한 장으로 — 전자카드 쪽 `partition-5` | 위 셋 |
| `face-reader.png` | Ubio X Face Pro | `images/face-reader/ubio-x-face-pro.png` |
| `face-site.png` | 현장에서 안면인식 단말기로 찍는 근로자 | `images/device/A-01.png` |
| `app.png` | 김반장 앱을 든 근로자 | `images/device/A-02.png` |
| `face-scene.png` | 위 둘을 한 장으로 — 안면인식 쪽 `partition-5` | 위 둘 |

`face-reader.png` 는 원본이 115×248 밖에 안 돼, `partition-5` 에서는 늘어나지
않도록 CSS 가 폭을 618px 로 묶어 둡니다(`service-intro.css` 의
`.intro-face .partition-5-img-area img`). 큰 제품컷이 생기면 덮어쓰고 그 줄을 지우세요.

### 권장 사양

- **형식** 배경이 투명한 PNG. 흰 사각형 배경이 있으면 짙은 파랑 바탕(`partition-5`)
  과 옅은 파랑 바탕(`img-group2`) 위에서 테가 보입니다.
- **정렬** 단말기가 프레임 아래쪽에 닿도록. `partition-5` 의 합성 사진은 세 대를
  **바닥 맞춰** 놓습니다 — 키가 다른 채로 바닥이 맞아야 '놓여 있는' 것으로 읽힙니다.
- **크기** `partition-2` 는 높이 250px 틀에, `partition-5` 는 최대 794px 폭에
  들어갑니다. 그보다 큰 그림은 무게만 됩니다.

## 라이브에서 가져온 것

아래는 kbz.co.kr 의 다른 서비스 소개페이지가 쓰는 그림을 그대로 옮긴 것입니다.
**단말기 전용 그림이 아니라 자리를 잡아둔 것**이니, 제품에 맞는 것이 생기면
덮어써 주세요.

| 파일 | 어디에 | 가져온 곳 |
| --- | --- | --- |
| `hero-card-reader.jpg` | 전자카드 `partition-1` 배경 | `kbz/social-insurances/partition-01.png` |
| `hero-face.jpg` | 안면인식 `partition-1` 배경 | `kbz/ta_manager/partition-01.png` |
| `premium-wide.jpg` · `premium-narrow.jpg` | `partition-6` 배경 (533px 경계로 갈림) | `kbz/public/partition-06(…).png` |
| `step/card-01~03.png` | 전자카드 `partition-3` — 검증(돋보기)·보정(출역 달력)·신고(서류와 공제부금) | `construction/03-02` · `social-insurances/03-01` · `regular_worker/03-02` |
| `step/face-01~03.png` | 안면인식 `partition-3` 의 3D 아이콘 | 여러 소개페이지의 `partition-03-*.png` |
| `voice-0*.jpg` | 후기 카드 아래 사진 | 여러 소개페이지의 `partition-04-*.png` |
| `marquee-icon.png` | 안면인식 쪽 롤링 띠 | `kbz/document/marquee-icon.png` |

`voice-0*.jpg` 는 **후기를 쓴 분의 사진이 아닙니다.** 라이브와 같은 쓰임(카드
아래를 채우는 그림)이며, 후기를 쓴 회사 이름은 카드 안에 따로 적혀 있습니다.

고객사 로고 띠는 여기 두지 않고 `images/partners/` 를 그대로 씁니다.
