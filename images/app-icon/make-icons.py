"""홈 화면에 놓이는 아이콘을 그린다.

손으로 그린 그림이다 — 시스템 스프라이트에는 얼굴이 없고(사람은 icon-employee
뿐인데 그것은 메뉴 아이콘이다), 앱 화면의 얼굴 인식 그림(.scan)과 같은 식구로
두려고 여기서 따로 그린다.

    python3 images/app-icon/make-icons.py

512 를 기준으로 그리고 줄인다. 그림이 가운데 반지름 150 안에 드는 것은
**maskable** 때문이다 — 안드로이드가 제 꼴(원·물방울·사각)로 잘라 내는데,
안전한 자리는 가운데 지름 80%(반지름 205)뿐이다. 그 안에 들어 있어야 어떤
꼴로 잘려도 얼굴이 잘리지 않는다.
"""
from PIL import Image, ImageDraw

BRAND = (17, 90, 198)     # --ap-primary · color/light/primary/60
WHITE = (255, 255, 255)
S = 512
SUP = 4                   # 4배로 그린 뒤 줄여 가장자리를 매끄럽게 한다


def draw(size: int) -> Image.Image:
    n = S * SUP
    im = Image.new("RGB", (n, n), BRAND)
    d = ImageDraw.Draw(im)
    k = SUP
    c = 256 * k

    # 얼굴이 앉는 흰 면
    r = 150 * k
    d.ellipse([c - r, c - r, c + r, c + r], fill=WHITE)
    # 눈
    er = 20 * k
    for ex in (210 * k, 302 * k):
        d.ellipse([ex - er, 222 * k - er, ex + er, 222 * k + er], fill=BRAND)
    # 입 — 아래로 둥근 호
    d.arc([200 * k, 232 * k, 312 * k, 322 * k], 20, 160, fill=BRAND, width=24 * k)

    return im.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    for n in (180, 192, 512):
        draw(n).save(os.path.join(here, f"icon-{n}.png"), optimize=True)
        print("icon-%d.png" % n)
