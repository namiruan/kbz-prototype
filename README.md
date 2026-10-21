# kbz-prototype

김반장 3.0 프로토타입 화면. 디자인 시스템 저장소([`kbz_3.0_ui_stytem`](https://github.com/namiruan/kbz_3.0_ui_stytem))가 만든 번들을 GitHub Pages 절대 URL로 당겨 쓴다.

```
estimate-prototype.html · prototype.html · quote-prototype.html   시나리오 목록(크롬)
estimate.html · plan-quote.html · quote.html · face-quote.html    끼워 보여 주는 화면
login.html · face-attendance-review.html · index.html
card-reader.html · face-attendance.html                            단말기 소개페이지
assets/                                                            화면 쪽 CSS·JS
```

소개페이지 두 장은 라이브(kbz.co.kr)의 서비스 소개페이지
(`/service/kbz/kbz_social_insurances` · `/service/kbz/kbz_document`)와 같은 틀이다
— `partition-1`~`partition-6` 과 바닥 고정 버튼. 그 틀은 두 화면이 나눠 쓰는
`assets/service-intro.css` · `assets/service-intro.js` 에 있고, 라이브의
`kbz_social_insurances.css` 를 옮긴 것이다. 사진은 `images/intro/README.md` 를 본다.

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
