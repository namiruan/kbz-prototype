# kbz-prototype

김반장 3.0 프로토타입 화면. 디자인 시스템 저장소([`kbz_3.0_ui_stytem`](https://github.com/namiruan/kbz_3.0_ui_stytem))가 만든 번들을 GitHub Pages 절대 URL로 당겨 쓴다.

```
estimate-prototype.html · prototype.html · quote-prototype.html   시나리오 목록(크롬)
face-attendance-app-prototype.html                                 앱 화면 목록 — 현장소장(크롬)
face-attendance-worker-prototype.html                              앱 화면 목록 — 근로자(크롬)
estimate.html · plan-quote.html · quote.html · face-quote.html    끼워 보여 주는 화면
face-attendance-app.html                                           앱 화면 — 현장소장 앱(kpmManager)
face-attendance-worker.html                                        앱 화면 — 근로자 앱(kpmUser)
manifest.webmanifest · images/app-icon/                            근로자 앱을 홈 화면에 놓을 때
login.html · face-attendance-review.html · index.html
card-reader.html · face-attendance.html                            단말기 소개페이지
assets/                                                            화면 쪽 CSS·JS
```

## 앱 화면만은 디자인 시스템을 싣지 않는다

`face-attendance-app.html`(현장소장)과 `face-attendance-worker.html`(근로자)은 웹이
아니라 앱(kpmManager · kpmUser) 화면이다. 둘은 **같은 `assets/face-attendance-app.css`·
`.js` 를 쓴다** — 한 앱의 두 쪽이라 생김새의 기준이 하나여야 한다. 파일을 가른 까닭은
시나리오 목록이 길어서이지 스타일이 달라서가 아니다.
값의 출처는 디자인 시스템이 아니라 **Figma 「[현장소장] 앱 디자인 리뉴얼 시안」** 하나다.

> <https://www.figma.com/design/YBZmOS5xQuNiQh7b1NaSBN>

시안이 쓰는 값(`#33363d` · `#b1b8be` · `#113569`)은 `tokens.css` 에 없고, 글자 크기도
iOS 스케일(17/22 · 22/28)이라 웹 토큰의 높이 체계와 맞지 않는다. 그래서 이 화면의
토큰은 `assets/face-attendance-app.css` 맨 위에 **시안의 변수 이름 그대로** 따로 둔다 —
시안이 바뀌면 고칠 자리가 그 한 곳이다.

크롬(`*-prototype.html`)은 그대로 디자인 시스템 것을 쓴다. 다만
**폭은 `sm`·`md` 뿐이다** — 앱이라 데스크톱에서 잴 것이 없다. 크롬 파일은 고치지 않고,
크롬이 읽는 값(`ProtoChrome.COMPARE` · 처음 열리는 폭)만 켜기 전에 바꾼다.

소개페이지 두 장은 라이브(kbz.co.kr)의 서비스 소개페이지
(`/service/kbz/kbz_social_insurances` · `/service/kbz/kbz_document`)와 같은 틀이다
— `partition-1`~`partition-6` 과 바닥 고정 버튼.

**그 틀의 CSS 는 베끼지 않고 라이브에서 그대로 부른다.** 라이브가 바뀌면 여기도
따라 바뀐다. 실리는 순서가 곧 승패다.

| | |
|---|---|
| `assets/base.css` | 리셋·토큰 |
| `kbz.co.kr/resources/css/common.css` | 타이포·`button{border:none}` 같은 공통 |
| `…/kbz_social_insurances.css` 또는 `…/kbz_document.css` | 그 화면이 쓰는 구역 CSS (롤링 띠는 `document` 쪽에만 있다) |
| `assets/service-intro.css` | **우리가 일부러 다르게 둔 것만** — 사진 스켈레톤, 전화 한 줄, `keep-all`, 라이브가 `height` 로 박아 둔 것 풀기 |

폰트만은 못 당겨 온다 — kbz.co.kr 의 woff2 응답에 `Access-Control-Allow-Origin`
이 없어 교차 출처 `@font-face` 가 막힌다. 그래서 같은 글꼴을 jsdelivr 에서 부른다.

동작(FAQ·캐러셀·바닥 버튼)은 `assets/service-intro.js` 다 — 라이브는 jQuery 로
쓰는데 이 저장소는 jQuery 를 들이지 않아 다시 썼다. 사진은
`images/intro/README.md` 를 본다.

**머리말·푸터는 넣지 않았다.** 라이브에서는 사이트 공통 크롬이 감싸고, 이 저장소의
다른 끼움 화면들도 머리말 없이 내용만 들고 있다.

---

## ⚠ 시나리오 설명문을 고치기 전에

`data-why` · `data-steps` · `data-look` 에 들어가는 글은 **문구 기준 규칙 1~16** 을 따른다. 기준은 **이 저장소가 아니라 디자인 시스템 저장소**에 있다.

> **`design-system/workflow/planner.md` → `### 화면설명 문구 기준 — 규칙 1~16`**
> <https://github.com/namiruan/kbz_3.0_ui_stytem/blob/main/design-system/workflow/planner.md>

커밋 메시지의 「규칙 2」·「규칙 16」은 그 번호를 가리킨다. 문서에서 `규칙 2.` 로 찾으면 된다.

세 묶음으로 되어 있다.

| | 규칙 | 무엇 |
|---|---|---|
| **적지 않는 것** | 1~4 | 눈으로 보면 아는 것 · 일어나지 않는 일 · 이 화면에서 볼 수 없는 것 · 수사와 형용 |
| **어떻게 적는가** | 5~12 | 두괄식 · 세는 수 금지 · 화면에 적힌 이름만 · 평범한 말 · 흐릿해지지 않기 · 같은 말 두 번 금지 · 모를 동작은 반드시 · 폭별 표기 |
| **적기 전에 확인** | 13~16 | 인용은 소스에서 · `act()` 상태에서 참인가 · 선택자가 그 요소인가 · 보이는 요소에만 앵커 |

앞의 두 묶음이 **무엇을 쓸지**, 마지막이 **쓰기 전에 코드로 확인할 것**이다. 기준을 새로 정했으면 **같은 커밋에** `planner.md` 도 고친다 — 뒤늦게 몰아서 채우면 그사이에 쓰는 설명이 옛 기준을 따른다.

### 표기법

| | 뜻 |
|---|---|
| `구역 ▸ 본문` | 잇달아 오는 같은 구역끼리 묶여 소제목이 선다 |
| `@{선택자}` | 그 줄을 누르면 화면의 그 요소에 테가 둘러진다 |
| `@sm` `@md` `@lg` | 그 폭에서만 되는 동작. 거르지 않고 **폭 태그**로 알리고, 누르면 그 폭으로 건너가 짚는다 |

차례는 `구역 ▸ @sm @md @{선택자} 본문`. 파서는 [`prototype/chrome/01-util.js`](https://github.com/namiruan/kbz_3.0_ui_stytem/blob/main/prototype/chrome/01-util.js) 의 `groupedListHtml` 이다.

---

## 크롬은 여기서 고치지 않는다

사이드바·폭 전환·비교 모드·화면설명 카드는 전부 디자인 시스템 저장소의 `prototype/chrome.css` 와 `prototype/chrome/*.js` 다. 이 저장소의 `*-prototype.html` 은 **시나리오 목록과 `act()` 만** 들고 있다.
