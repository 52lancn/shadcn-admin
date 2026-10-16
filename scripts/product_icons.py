# -*- coding: utf-8 -*-
"""
商品图形库。

为每个 demo 商品绘制一个与其名称对应的简笔图形（100x100 坐标系），
配合渐变背景生成商品图，使「数据列表」里的图片与品名真正对得上。
"""


def headphone(c, a):
    return [
        f'<path d="M20 62V50a30 30 0 0 1 60 0v12" fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round"/>',
        f'<rect x="8" y="52" width="18" height="32" rx="9" fill="{c}"/>',
        f'<rect x="74" y="52" width="18" height="32" rx="9" fill="{c}"/>',
        f'<rect x="13" y="58" width="8" height="18" rx="4" fill="{a}"/>',
        f'<rect x="79" y="58" width="8" height="18" rx="4" fill="{a}"/>',
    ]


def watch(c, a):
    return [
        f'<rect x="36" y="14" width="28" height="16" rx="6" fill="{a}"/>',
        f'<rect x="36" y="70" width="28" height="16" rx="6" fill="{a}"/>',
        f'<rect x="28" y="26" width="44" height="48" rx="12" fill="{c}"/>',
        f'<circle cx="50" cy="50" r="14" fill="none" stroke="{a}" stroke-width="4"/>',
        f'<path d="M50 42v8l6 5" stroke="{a}" stroke-width="4" fill="none" stroke-linecap="round"/>',
    ]


def projector(c, a):
    return [
        f'<rect x="12" y="34" width="60" height="34" rx="8" fill="{c}"/>',
        f'<circle cx="60" cy="51" r="9" fill="{a}"/>',
        f'<circle cx="60" cy="51" r="4" fill="{c}"/>',
        f'<path d="M76 40l14-8v36l-14-8z" fill="{a}" opacity="0.55"/>',
        f'<rect x="24" y="72" width="6" height="8" rx="3" fill="{c}"/>',
        f'<rect x="54" y="72" width="6" height="8" rx="3" fill="{c}"/>',
    ]


def keyboard(c, a):
    parts = [f'<rect x="8" y="32" width="84" height="40" rx="7" fill="{c}"/>']
    for r in range(3):
        for i in range(9):
            x = 15 + i * 9 + (r * 2)
            y = 39 + r * 11
            parts.append(f'<rect x="{x}" y="{y}" width="6" height="7" rx="2" fill="{a}" opacity="0.85"/>')
    parts.append(f'<rect x="26" y="72" width="48" height="7" rx="3.5" fill="{a}"/>')
    return parts


def charge_pad(c, a):
    return [
        f'<ellipse cx="50" cy="72" rx="34" ry="12" fill="{c}"/>',
        f'<ellipse cx="50" cy="69" rx="26" ry="8" fill="{a}" opacity="0.55"/>',
        f'<rect x="33" y="22" width="34" height="46" rx="7" fill="{c}"/>',
        f'<rect x="37" y="27" width="26" height="36" rx="4" fill="{a}" opacity="0.35"/>',
        f'<path d="M52 32l-10 16h8l-3 12 12-18h-8z" fill="{a}"/>',
    ]


def camera(c, a):
    return [
        f'<rect x="26" y="20" width="22" height="10" rx="4" fill="{a}"/>',
        f'<rect x="10" y="28" width="80" height="50" rx="10" fill="{c}"/>',
        f'<circle cx="50" cy="53" r="18" fill="{a}"/>',
        f'<circle cx="50" cy="53" r="10" fill="{c}"/>',
        f'<circle cx="50" cy="53" r="4" fill="{a}"/>',
        f'<circle cx="76" cy="38" r="3" fill="{a}"/>',
    ]


def speaker(c, a):
    return [
        f'<rect x="24" y="14" width="52" height="72" rx="12" fill="{c}"/>',
        f'<circle cx="50" cy="34" r="12" fill="{a}"/>',
        f'<circle cx="50" cy="34" r="5" fill="{c}"/>',
        f'<circle cx="50" cy="64" r="15" fill="{a}"/>',
        f'<circle cx="50" cy="64" r="6" fill="{c}"/>',
    ]


def drive(c, a):
    return [
        f'<rect x="14" y="34" width="72" height="36" rx="8" fill="{c}"/>',
        f'<rect x="14" y="34" width="72" height="10" rx="5" fill="{a}" opacity="0.6"/>',
        f'<rect x="62" y="54" width="16" height="8" rx="3" fill="{a}"/>',
        f'<circle cx="30" cy="58" r="5" fill="{a}"/>',
        f'<rect x="40" y="55" width="14" height="6" rx="3" fill="{a}" opacity="0.7"/>',
    ]


def pillow(c, a):
    return [
        f'<path d="M14 74c0-18 12-30 36-30s36 12 36 30-14 12-36 12S14 92 14 74z" fill="{c}"/>',
        f'<path d="M24 62c6-10 16-14 26-14s20 4 26 14c-8-4-16-6-26-6s-18 2-26 6z" fill="{a}" opacity="0.7"/>',
        f'<path d="M38 48l24 30" stroke="{a}" stroke-width="3" opacity="0.4" fill="none"/>',
    ]


def humidifier(c, a):
    return [
        f'<path d="M30 40h40l-6 44H36z" fill="{c}"/>',
        f'<rect x="42" y="28" width="16" height="12" rx="4" fill="{a}"/>',
        f'<path d="M40 22c0-6 20-6 20 0" stroke="{a}" stroke-width="4" fill="none" stroke-linecap="round"/>',
        f'<path d="M36 14c0-8 28-8 28 0" stroke="{a}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6"/>',
        f'<path d="M44 52h12" stroke="{a}" stroke-width="4" stroke-linecap="round"/>',
    ]


def storage_box(c, a):
    return [
        f'<path d="M18 40h64l-6 42H24z" fill="{c}"/>',
        f'<rect x="14" y="30" width="72" height="14" rx="6" fill="{a}"/>',
        f'<path d="M40 30v-8a10 10 0 0 1 20 0v8" fill="none" stroke="{a}" stroke-width="5"/>',
        f'<path d="M36 56h28" stroke="{a}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>',
    ]


def tableware(c, a):
    return [
        f'<circle cx="50" cy="56" r="30" fill="{c}"/>',
        f'<circle cx="50" cy="56" r="20" fill="{a}" opacity="0.45"/>',
        f'<path d="M22 30v34M28 30v34M34 30v30" stroke="{c}" stroke-width="4" stroke-linecap="round"/>',
        f'<path d="M70 30c-8 0-8 30 0 30s8-30 0-30z" fill="{c}"/>',
        f'<path d="M74 30v30" stroke="{c}" stroke-width="4" stroke-linecap="round"/>',
    ]


def mattress(c, a):
    return [
        f'<rect x="10" y="34" width="80" height="38" rx="10" fill="{c}"/>',
        f'<rect x="10" y="34" width="80" height="12" rx="6" fill="{a}" opacity="0.6"/>',
        f'<path d="M30 50v22M50 50v22M70 50v22" stroke="{a}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>',
        f'<rect x="16" y="72" width="10" height="10" rx="3" fill="{a}"/>',
        f'<rect x="74" y="72" width="10" height="10" rx="3" fill="{a}"/>',
    ]


def floor_lamp(c, a):
    return [
        f'<circle cx="50" cy="46" r="26" fill="{a}" opacity="0.22"/>',
        f'<path d="M28 42h44l-8-22H36z" fill="{c}"/>',
        f'<path d="M50 42v40" stroke="{c}" stroke-width="6" stroke-linecap="round"/>',
        f'<ellipse cx="50" cy="84" rx="22" ry="7" fill="{c}"/>',
        f'<circle cx="50" cy="46" r="8" fill="{a}"/>',
    ]


def diatom_mat(c, a):
    return [
        f'<rect x="12" y="30" width="76" height="46" rx="10" fill="{c}"/>',
        f'<rect x="20" y="38" width="60" height="30" rx="6" fill="{a}" opacity="0.35"/>',
    ] + [
        f'<circle cx="{22 + i * 12}" cy="{45 + (j * 12)}" r="2.5" fill="{a}" opacity="0.9"/>'
        for i in range(5)
        for j in range(2)
    ]


def bedding(c, a):
    return [
        f'<rect x="16" y="58" width="68" height="22" rx="8" fill="{c}"/>',
        f'<rect x="22" y="42" width="56" height="18" rx="7" fill="{a}"/>',
        f'<rect x="28" y="28" width="44" height="16" rx="6" fill="{c}" opacity="0.9"/>',
        f'<path d="M34 66h32M34 72h24" stroke="{a}" stroke-width="3" opacity="0.6" stroke-linecap="round"/>',
    ]


def jacket(c, a):
    return [
        f'<path d="M34 24l16 8 16-8 14 10-6 14-6-4v38H32V44l-6 4-6-14z" fill="{c}"/>',
        f'<path d="M50 32v54" stroke="{a}" stroke-width="4"/>',
        f'<path d="M38 48h24M38 60h24" stroke="{a}" stroke-width="3" opacity="0.7"/>',
    ]


def handbag(c, a):
    return [
        f'<path d="M34 42a16 16 0 0 1 32 0" fill="none" stroke="{a}" stroke-width="6" stroke-linecap="round"/>',
        f'<rect x="18" y="40" width="64" height="46" rx="8" fill="{c}"/>',
        f'<rect x="18" y="40" width="64" height="12" rx="6" fill="{a}" opacity="0.7"/>',
        f'<rect x="44" y="58" width="12" height="10" rx="3" fill="{a}"/>',
    ]


def cardigan(c, a):
    return [
        f'<path d="M34 26l16 10 16-10 14 12-8 12-6-5v49H32V45l-6 5-8-12z" fill="{c}"/>',
        f'<path d="M46 36l4 58M54 36l-4 58" stroke="{a}" stroke-width="4"/>',
        f'<circle cx="46" cy="56" r="2.5" fill="{a}"/>',
        f'<circle cx="46" cy="68" r="2.5" fill="{a}"/>',
    ]


def running_shoe(c, a):
    return [
        f'<path d="M12 74c0-10 6-16 14-18l18-14 10 4-4 10 14 4c12 4 22 8 22 16H12z" fill="{c}"/>',
        f'<path d="M12 74h76v8H12z" fill="{a}"/>',
        f'<path d="M30 60l10-6M40 64l10-6" stroke="{a}" stroke-width="4" stroke-linecap="round"/>',
    ]


def shirt(c, a):
    return [
        f'<path d="M36 24l14 10 14-10 16 12-8 12-6-4v46H30V44l-6 4-8-12z" fill="{c}"/>',
        f'<path d="M36 24l14 18 14-18-6-4-8 6-8-6z" fill="{a}"/>',
        f'<path d="M44 52h12v40H44z" fill="{a}" opacity="0.45"/>',
    ]


def scarf(c, a):
    return [
        f'<path d="M22 30c14-8 26 8 40 0s18 6 18 6v14c-14 8-26-8-40 0s-18-6-18-6z" fill="{c}"/>',
        f'<path d="M26 50l-6 34M40 52l4 32M62 50l8 34" stroke="{c}" stroke-width="8" stroke-linecap="round"/>',
        f'<path d="M30 34c12-6 22 6 34 0" stroke="{a}" stroke-width="4" fill="none" stroke-linecap="round"/>',
    ]


def jeans(c, a):
    return [
        f'<path d="M26 22h48l4 62-22 4-8-30-8 30-22-4z" fill="{c}"/>',
        f'<rect x="26" y="22" width="48" height="12" rx="4" fill="{a}"/>',
        f'<path d="M50 40v20" stroke="{a}" stroke-width="4" opacity="0.8"/>',
        f'<path d="M32 66h14M54 66h14" stroke="{a}" stroke-width="3" opacity="0.7"/>',
    ]


def sun_hat(c, a):
    return [
        f'<path d="M28 52a22 22 0 0 1 44 0z" fill="{c}"/>',
        f'<ellipse cx="50" cy="54" rx="40" ry="12" fill="{c}"/>',
        f'<ellipse cx="50" cy="52" rx="40" ry="10" fill="{a}" opacity="0.55"/>',
        f'<path d="M28 50a22 20 0 0 1 44 0" fill="none" stroke="{a}" stroke-width="5"/>',
    ]


def coffee(c, a):
    return [
        f'<path d="M26 32h44l-5 50H31z" fill="{c}"/>',
        f'<rect x="22" y="24" width="52" height="12" rx="6" fill="{a}"/>',
        f'<path d="M74 40c8 0 8 20 0 20" stroke="{a}" stroke-width="6" fill="none" stroke-linecap="round"/>',
        f'<path d="M38 48h20M40 60h16" stroke="{a}" stroke-width="4" opacity="0.8" stroke-linecap="round"/>',
    ]


def oil_bottle(c, a):
    return [
        f'<path d="M42 20h16v10l8 12v40a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V42l8-12z" fill="{c}"/>',
        f'<rect x="38" y="14" width="24" height="8" rx="3" fill="{a}"/>',
        f'<path d="M40 56h20v22H40z" fill="{a}" opacity="0.55"/>',
        f'<path d="M50 24v6" stroke="{a}" stroke-width="4"/>',
    ]


def nut_gift(c, a):
    return [
        f'<rect x="14" y="36" width="72" height="48" rx="8" fill="{c}"/>',
        f'<rect x="14" y="30" width="72" height="14" rx="6" fill="{a}"/>',
        f'<path d="M50 30v54" stroke="{a}" stroke-width="6"/>',
        f'<path d="M36 30c-6-10 28-10 28 0" fill="none" stroke="{a}" stroke-width="5"/>',
        f'<circle cx="34" cy="60" r="7" fill="{a}" opacity="0.8"/>',
        f'<circle cx="66" cy="60" r="7" fill="{a}" opacity="0.8"/>',
    ]


def yogurt(c, a):
    return [
        f'<path d="M32 34h36l4 50H28z" fill="{c}"/>',
        f'<rect x="28" y="24" width="44" height="12" rx="6" fill="{a}"/>',
        f'<rect x="36" y="52" width="28" height="20" rx="4" fill="{a}" opacity="0.6"/>',
        f'<path d="M46 18h8v6h-8z" fill="{a}"/>',
    ]


def sesame_ball(c, a):
    return [
        f'<circle cx="36" cy="44" r="18" fill="{c}"/>',
        f'<circle cx="64" cy="44" r="18" fill="{c}"/>',
        f'<circle cx="50" cy="70" r="18" fill="{c}"/>',
    ] + [
        f'<circle cx="{30 + (i % 3) * 16}" cy="{36 + (i // 3) * 16}" r="2" fill="{a}"/>' for i in range(9)
    ]


def crackers(c, a):
    parts = []
    for i in range(2):
        for j in range(2):
            x, y = 22 + j * 32, 28 + i * 32
            parts.append(f'<rect x="{x}" y="{y}" width="26" height="26" rx="5" fill="{c if (i + j) % 2 == 0 else a}"/>')
            parts.append(f'<circle cx="{x + 8}" cy="{y + 9}" r="1.8" fill="#ffffff" opacity="0.85"/>')
            parts.append(f'<circle cx="{x + 18}" cy="{y + 16}" r="1.8" fill="#ffffff" opacity="0.85"/>')
    return parts


def fruit_chips(c, a):
    return [
        f'<circle cx="34" cy="42" r="20" fill="{c}"/>',
        f'<circle cx="34" cy="42" r="12" fill="{a}" opacity="0.8"/>',
        f'<circle cx="66" cy="58" r="20" fill="{c}"/>',
        f'<circle cx="66" cy="58" r="12" fill="{a}" opacity="0.8"/>',
        f'<path d="M34 22v40M14 42h40M66 38v40M46 58h40" stroke="{a}" stroke-width="2" opacity="0.6"/>',
    ]


def steak(c, a):
    return [
        f'<path d="M20 60c0-20 14-30 34-30s26 12 26 26-12 22-28 22-32 2-32-18z" fill="{c}"/>',
        f'<path d="M34 56c4-12 14-18 26-18s16 6 16 14-8 12-20 12-24-2-22-8z" fill="{a}" opacity="0.65"/>',
        f'<path d="M74 40c8 4 10 12 4 16" stroke="{a}" stroke-width="6" fill="none" stroke-linecap="round"/>',
    ]


def trekking_pole(c, a):
    return [
        f'<path d="M26 84l30-52" stroke="{c}" stroke-width="7" stroke-linecap="round"/>',
        f'<path d="M56 32a10 10 0 1 1 14 10" fill="none" stroke="{a}" stroke-width="7" stroke-linecap="round"/>',
        f'<path d="M22 84l8 8" stroke="{a}" stroke-width="7" stroke-linecap="round"/>',
        f'<circle cx="66" cy="26" r="7" fill="{a}"/>',
    ]


def sports_set(c, a):
    return [
        f'<path d="M36 22l14 8 14-8 12 10-6 10-5-3v25H35V39l-5 3-6-10z" fill="{c}"/>',
        f'<path d="M32 62h36l-3 20H42l4-10-6 10H30z" fill="{c}"/>',
        f'<path d="M36 68h28" stroke="{a}" stroke-width="4" stroke-linecap="round"/>',
    ]


def camp_chair(c, a):
    return [
        f'<path d="M28 30h44l-6 34H34z" fill="{c}"/>',
        f'<path d="M34 64l-14 22M66 64l14 22M40 64l6 22M60 64l-6 22" stroke="{a}" stroke-width="6" stroke-linecap="round"/>',
        f'<path d="M32 40h36" stroke="{a}" stroke-width="4" opacity="0.7"/>',
    ]


def backpack(c, a):
    return [
        f'<path d="M34 42a16 14 0 0 1 32 0" fill="none" stroke="{a}" stroke-width="6" stroke-linecap="round"/>',
        f'<path d="M24 42c0-8 6-12 26-12s26 4 26 12v34a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8z" fill="{c}"/>',
        f'<rect x="34" y="58" width="32" height="18" rx="6" fill="{a}" opacity="0.7"/>',
        f'<path d="M42 70h16" stroke="{c}" stroke-width="4" stroke-linecap="round"/>',
    ]


def yoga_mat(c, a):
    return [
        f'<ellipse cx="34" cy="50" rx="16" ry="30" fill="{c}"/>',
        f'<rect x="34" y="20" width="42" height="60" rx="6" fill="{c}"/>',
        f'<ellipse cx="76" cy="50" rx="12" ry="30" fill="{a}"/>',
        f'<ellipse cx="76" cy="50" rx="6" ry="18" fill="{c}"/>',
    ]


def helmet(c, a):
    return [
        f'<path d="M16 60a34 30 0 0 1 68 0v6H16z" fill="{c}"/>',
        f'<path d="M30 40h12M46 34h14M64 40h10" stroke="{a}" stroke-width="6" stroke-linecap="round"/>',
        f'<rect x="16" y="64" width="68" height="8" rx="4" fill="{a}"/>',
        f'<path d="M40 72l6 14M60 72l-6 14" stroke="{c}" stroke-width="5" stroke-linecap="round"/>',
    ]


def thermos(c, a):
    return [
        f'<rect x="42" y="12" width="16" height="10" rx="4" fill="{a}"/>',
        f'<path d="M36 22h28v10l6 12v40a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8V44l6-12z" fill="{c}"/>',
        f'<rect x="30" y="52" width="40" height="22" rx="4" fill="{a}" opacity="0.55"/>',
        f'<path d="M38 34h24" stroke="{a}" stroke-width="4" opacity="0.8"/>',
    ]


def fascia_gun(c, a):
    return [
        f'<circle cx="66" cy="34" r="14" fill="{a}"/>',
        f'<rect x="20" y="40" width="44" height="22" rx="9" fill="{c}"/>',
        f'<path d="M38 60l10 30h14l-6-30z" fill="{c}"/>',
        f'<circle cx="32" cy="51" r="4" fill="{a}"/>',
    ]


def cleanser(c, a):
    return [
        f'<path d="M34 22h32v56a10 10 0 0 1-10 10H44a10 10 0 0 1-10-10z" fill="{c}"/>',
        f'<rect x="42" y="10" width="16" height="14" rx="4" fill="{a}"/>',
        f'<path d="M38 50h24" stroke="{a}" stroke-width="6" stroke-linecap="round"/>',
        f'<circle cx="50" cy="66" r="8" fill="{a}" opacity="0.6"/>',
    ]


def skincare(c, a):
    return [
        f'<path d="M22 30h24v58a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill="{c}"/>',
        f'<rect x="26" y="18" width="16" height="12" rx="4" fill="{a}"/>',
        f'<path d="M54 44h24v44a6 6 0 0 1-6 6H60a6 6 0 0 1-6-6z" fill="{c}"/>',
        f'<rect x="60" y="32" width="12" height="12" rx="4" fill="{a}"/>',
        f'<path d="M28 56h16" stroke="{a}" stroke-width="4" opacity="0.8"/>',
    ]


def sunscreen(c, a):
    return [
        f'<circle cx="66" cy="30" r="10" fill="{a}"/>',
        f'<path d="M66 12v-6M66 54v-6M48 30h-6M90 30h-6M54 18l-4-4M78 42l4 4" stroke="{a}" stroke-width="3" stroke-linecap="round"/>',
        f'<path d="M24 40h34v44a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8z" fill="{c}"/>',
        f'<rect x="32" y="28" width="18" height="12" rx="4" fill="{a}"/>',
    ]


def hair_oil(c, a):
    return [
        f'<rect x="44" y="8" width="12" height="16" rx="5" fill="{a}"/>',
        f'<path d="M38 24h24v10l6 10v42a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V44l6-10z" fill="{c}"/>',
        f'<path d="M50 56c-6 8-6 14 0 20 6-6 6-12 0-20z" fill="{a}"/>',
    ]


def lip_balm(c, a):
    return [
        f'<rect x="38" y="24" width="24" height="52" rx="6" fill="{a}"/>',
        f'<path d="M38 24h24l-4-12H42z" fill="{c}"/>',
        f'<path d="M38 76h24v6a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z" fill="{c}"/>',
        f'<path d="M44 40h12" stroke="{c}" stroke-width="4" opacity="0.6"/>',
    ]


def mens_set(c, a):
    return [
        f'<path d="M26 26h20v60a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8z" fill="{c}"/>',
        f'<rect x="30" y="16" width="12" height="12" rx="4" fill="{a}"/>',
        f'<path d="M56 34h20v52a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8z" fill="{c}"/>',
        f'<rect x="60" y="24" width="12" height="12" rx="4" fill="{a}"/>',
        f'<path d="M30 56h12M60 60h12" stroke="{a}" stroke-width="4" opacity="0.85" stroke-linecap="round"/>',
    ]


def body_wash(c, a):
    return [
        f'<path d="M30 44h40v40a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8z" fill="{c}"/>',
        f'<rect x="42" y="30" width="16" height="14" rx="4" fill="{a}"/>',
        f'<path d="M50 30V14h14" stroke="{a}" stroke-width="6" fill="none" stroke-linecap="round"/>',
        f'<path d="M36 60h28" stroke="{a}" stroke-width="5" opacity="0.8" stroke-linecap="round"/>',
    ]


def toothbrush(c, a):
    return [
        f'<rect x="42" y="36" width="14" height="52" rx="7" fill="{c}"/>',
        f'<rect x="40" y="16" width="18" height="22" rx="6" fill="{a}"/>',
        f'<path d="M46 10v8M52 10v8M58 10v8" stroke="{a}" stroke-width="4" stroke-linecap="round"/>',
        f'<circle cx="49" cy="54" r="3" fill="{a}"/>',
        f'<circle cx="49" cy="66" r="3" fill="{a}"/>',
    ]


ICON_BY_WORD = {
    "降噪耳机": headphone,
    "智能手表": watch,
    "便携投影": projector,
    "机械键盘": keyboard,
    "无线充电板": charge_pad,
    "4K 摄像头": camera,
    "蓝牙音箱": speaker,
    "移动固态硬盘": drive,
    "记忆棉枕": pillow,
    "香薰加湿器": humidifier,
    "折叠收纳箱": storage_box,
    "陶瓷餐具组": tableware,
    "记忆棉床垫": mattress,
    "落地氛围灯": floor_lamp,
    "硅藻土地垫": diatom_mat,
    "全棉四件套": bedding,
    "轻量冲锋衣": jacket,
    "真皮通勤包": handbag,
    "针织开衫": cardigan,
    "透气跑鞋": running_shoe,
    "亚麻衬衫": shirt,
    "羊毛围巾": scarf,
    "牛仔直筒裤": jeans,
    "防晒帽": sun_hat,
    "冷萃咖啡液": coffee,
    "有机山茶油": oil_bottle,
    "手作坚果礼盒": nut_gift,
    "低温酸奶": yogurt,
    "现磨黑芝麻丸": sesame_ball,
    "海盐苏打饼": crackers,
    "冻干水果脆": fruit_chips,
    "原切牛排": steak,
    "碳纤维登山杖": trekking_pole,
    "速干运动套装": sports_set,
    "露营折叠椅": camp_chair,
    "战术背包": backpack,
    "瑜伽垫": yoga_mat,
    "骑行头盔": helmet,
    "保温运动水壶": thermos,
    "筋膜枪": fascia_gun,
    "氨基酸洁面": cleanser,
    "精华水乳套装": skincare,
    "高倍防晒乳": sunscreen,
    "护发精油": hair_oil,
    "唇部养护膏": lip_balm,
    "男士控油套装": mens_set,
    "香氛沐浴露": body_wash,
    "电动牙刷": toothbrush,
}

CATEGORY_ICON = {
    "数码电子": drive,
    "家居生活": storage_box,
    "服饰鞋包": handbag,
    "食品生鲜": coffee,
    "运动户外": backpack,
    "美妆个护": skincare,
}


def icon_for(word, category):
    """按商品名取图形，取不到时退回品类兜底图形。"""
    return ICON_BY_WORD.get(word) or CATEGORY_ICON.get(category) or storage_box
