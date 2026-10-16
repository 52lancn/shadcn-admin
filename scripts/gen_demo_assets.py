#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Phase 2 asset generator.

Produces two things so the demo module works fully offline:

  1. web/public/gallery/*.svg  - procedural artwork used by the gallery demo
  2. server/sql/demo_seed.sql  - seed rows for demo_product / demo_gallery / demo_order

Usage:  python scripts/gen_demo_assets.py
"""
import colorsys
import os
import random
import datetime
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from product_icons import icon_for  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GALLERY_DIR = os.path.join(ROOT, "web", "public", "gallery")
PRODUCT_DIR = os.path.join(ROOT, "web", "public", "products")
SQL_OUT = os.path.join(ROOT, "server", "sql", "demo_seed.sql")

random.seed(20261015)

# --------------------------------------------------------------------------
# palettes: each entry is (hue_base, saturation, mood) -> we derive 3 colors
# --------------------------------------------------------------------------
PALETTES = [
    (212, 0.72),  # ocean blue
    (268, 0.62),  # violet
    (158, 0.58),  # emerald
    (28, 0.78),   # amber
    (342, 0.66),  # rose
    (188, 0.62),  # cyan
    (98, 0.52),   # lime
    (232, 0.68),  # indigo
]


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360.0, l, s)
    return "#%02x%02x%02x" % (int(r * 255), int(g * 255), int(b * 255))


def palette_of(hue, sat):
    return {
        "deep": hsl(hue, sat * 0.85, 0.10),
        "mid": hsl(hue + 12, sat * 0.8, 0.32),
        "bright": hsl(hue + 30, sat * 0.95, 0.62),
        "accent": hsl(hue + 165, sat * 0.9, 0.66),
        "soft": hsl(hue + 20, sat * 0.5, 0.82),
    }


# --------------------------------------------------------------------------
# art templates
# --------------------------------------------------------------------------
def art_mountains(w, h, p, rnd):
    """Layered mountain ridges under a gradient sky."""
    sun = rnd.uniform(0.18, 0.78)
    parts = [
        f'<rect width="{w}" height="{h}" fill="url(#sky)"/>',
        f'<circle cx="{w * sun:.0f}" cy="{h * 0.26:.0f}" r="{h * 0.11:.0f}" fill="{p["soft"]}" opacity="0.92"/>',
        f'<circle cx="{w * sun:.0f}" cy="{h * 0.26:.0f}" r="{h * 0.19:.0f}" fill="{p["bright"]}" opacity="0.16"/>',
    ]
    ridges = 4
    for i in range(ridges):
        base = h * (0.52 + i * 0.13)
        amp = h * (0.20 - i * 0.035)
        pts = [f"0,{h}", f"0,{base:.0f}"]
        steps = 7
        for s in range(steps + 1):
            x = w * s / steps
            y = base - abs(rnd.uniform(-1, 1)) * amp
            pts.append(f"{x:.0f},{y:.0f}")
        pts.append(f"{w},{base:.0f}")
        pts.append(f"{w},{h}")
        opacity = 0.28 + i * 0.20
        fill = p["mid"] if i < 2 else p["deep"]
        parts.append(
            f'<polygon points="{" ".join(pts)}" fill="{fill}" opacity="{opacity:.2f}"/>'
        )
    return parts


def art_waves(w, h, p, rnd):
    """Flowing sine bands."""
    parts = [f'<rect width="{w}" height="{h}" fill="url(#sky)"/>']
    bands = 9
    for i in range(bands):
        y0 = h * (0.08 + i * 0.10)
        amp = h * rnd.uniform(0.03, 0.09)
        phase = rnd.uniform(0, 6.28)
        cmds = [f"M0,{y0:.0f}"]
        steps = 24
        for s in range(1, steps + 1):
            x = w * s / steps
            y = y0 + amp * ((s / steps) * 6.28 * 1.4 + phase and 1) * (
                0.5 + 0.5 * (((s / steps) * 6.28 * 1.4 + phase) % 6.28318) / 6.28318
            )
            cmds.append(f"L{x:.0f},{y:.0f}")
        cmds.append(f"L{w},{h} L0,{h} Z")
        color = p["bright"] if i % 2 == 0 else p["mid"]
        parts.append(
            f'<path d="{" ".join(cmds)}" fill="{color}" opacity="{0.10 + i * 0.045:.2f}"/>'
        )
    return parts


def art_city(w, h, p, rnd):
    """Night skyline with lit windows."""
    parts = [
        f'<rect width="{w}" height="{h}" fill="url(#sky)"/>',
        f'<circle cx="{w * 0.74:.0f}" cy="{h * 0.2:.0f}" r="{h * 0.09:.0f}" fill="{p["soft"]}" opacity="0.7"/>',
    ]
    x = 0
    while x < w:
        bw = w * rnd.uniform(0.045, 0.10)
        bh = h * rnd.uniform(0.24, 0.62)
        y = h - bh
        parts.append(
            f'<rect x="{x:.0f}" y="{y:.0f}" width="{bw:.0f}" height="{bh:.0f}" fill="{p["deep"]}" opacity="0.92"/>'
        )
        rows = int(bh // (h * 0.06))
        cols = max(1, int(bw // (w * 0.022)))
        for r in range(rows):
            for c in range(cols):
                if rnd.random() < 0.42:
                    wx = x + (c + 0.28) * (bw / cols)
                    wy = y + (r + 0.28) * (h * 0.06)
                    parts.append(
                        f'<rect x="{wx:.0f}" y="{wy:.0f}" width="{bw / cols * 0.42:.0f}" '
                        f'height="{h * 0.026:.0f}" fill="{p["bright"]}" opacity="{rnd.uniform(0.35, 0.95):.2f}"/>'
                    )
        x += bw + w * 0.008
    return parts


def art_grid(w, h, p, rnd):
    """Glowing perspective grid (tech)."""
    parts = [f'<rect width="{w}" height="{h}" fill="url(#sky)"/>']
    for i in range(16):
        y = h * 0.42 + (i * i) * h * 0.0028
        if y > h:
            break
        parts.append(
            f'<line x1="0" y1="{y:.0f}" x2="{w}" y2="{y:.0f}" stroke="{p["bright"]}" '
            f'stroke-width="{1 + i * 0.12:.1f}" opacity="{0.10 + i * 0.035:.2f}"/>'
        )
    for i in range(-14, 15):
        x0 = w * 0.5 + i * w * 0.028
        parts.append(
            f'<line x1="{w * 0.5:.0f}" y1="{h * 0.42:.0f}" x2="{x0:.0f}" y2="{h}" '
            f'stroke="{p["bright"]}" stroke-width="1.2" opacity="0.22"/>'
        )
    for _ in range(26):
        parts.append(
            f'<circle cx="{rnd.uniform(0, w):.0f}" cy="{rnd.uniform(0, h * 0.9):.0f}" '
            f'r="{rnd.uniform(1.2, 4.2):.1f}" fill="{p["accent"]}" opacity="{rnd.uniform(0.3, 0.9):.2f}"/>'
        )
    return parts


def art_orbits(w, h, p, rnd):
    """Concentric orbits / abstract geometry."""
    parts = [f'<rect width="{w}" height="{h}" fill="url(#sky)"/>']
    cx, cy = w * rnd.uniform(0.36, 0.64), h * rnd.uniform(0.4, 0.6)
    for i in range(11, 0, -1):
        r = i * (min(w, h) * 0.048)
        parts.append(
            f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="none" '
            f'stroke="{p["bright"] if i % 2 else p["accent"]}" stroke-width="{1.0 + i * 0.14:.1f}" '
            f'opacity="{0.10 + (11 - i) * 0.055:.2f}"/>'
        )
    for _ in range(5):
        ang = rnd.uniform(0, 6.28)
        rr = min(w, h) * rnd.uniform(0.14, 0.46)
        parts.append(
            f'<circle cx="{cx + rr * (0.5 + 0.5 * (ang % 6.28318) / 6.28318) * 1.2:.0f}" '
            f'cy="{cy + rr * 0.6:.0f}" r="{rnd.uniform(5, 16):.0f}" fill="{p["soft"]}" '
            f'opacity="{rnd.uniform(0.4, 0.9):.2f}"/>'
        )
    parts.append(
        f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{min(w, h) * 0.075:.0f}" fill="{p["bright"]}" opacity="0.85"/>'
    )
    return parts


def art_aurora(w, h, p, rnd):
    """Soft aurora ribbons."""
    parts = [f'<rect width="{w}" height="{h}" fill="url(#sky)"/>']
    for i in range(7):
        y0 = h * rnd.uniform(0.06, 0.5)
        amp = h * rnd.uniform(0.05, 0.16)
        d = [f"M0,{y0:.0f}"]
        steps = 16
        for s in range(1, steps + 1):
            x = w * s / steps
            y = y0 + amp * ((s / steps) * 6.28 + i) * 0.16
            d.append(f"Q{x - w / steps / 2:.0f},{y - amp * 0.8:.0f} {x:.0f},{y:.0f}")
        color = p["accent"] if i % 2 == 0 else p["bright"]
        parts.append(
            f'<path d="{" ".join(d)}" fill="none" stroke="{color}" '
            f'stroke-width="{h * rnd.uniform(0.012, 0.045):.0f}" opacity="{rnd.uniform(0.18, 0.5):.2f}" '
            f'stroke-linecap="round"/>'
        )
    for _ in range(70):
        parts.append(
            f'<circle cx="{rnd.uniform(0, w):.0f}" cy="{rnd.uniform(0, h * 0.55):.0f}" '
            f'r="{rnd.uniform(0.7, 2.1):.1f}" fill="#ffffff" opacity="{rnd.uniform(0.2, 0.85):.2f}"/>'
        )
    return parts


TEMPLATES = {
    "nature": [art_mountains, art_aurora],
    "city": [art_city],
    "tech": [art_grid],
    "abstract": [art_orbits, art_waves],
}

CATEGORY_CN = {"nature": "自然风光", "city": "城市建筑", "tech": "科技抽象", "abstract": "艺术抽象"}

TITLES = {
    "nature": ["晨雾山脊", "极光之夜", "静谧湖畔", "雪峰初照", "林间晨光"],
    "city": ["夜色天际", "霓虹街区", "清晨港湾", "钢铁森林", "云端之上"],
    "tech": ["数据网格", "量子回廊", "深空链路", "神经脉络", "矩阵视界"],
    "abstract": ["同心之境", "流波序列", "几何幻想", "色彩涟漪", "无限循环"],
}

DESCS = {
    "nature": "层叠山脊与柔光雾气，色调取自日出前的冷蓝时刻。",
    "city": "夜幕下的城市剪影，窗格灯光随机点亮，呈现密集都市感。",
    "tech": "透视网格与浮动光点，适合作为科技类封面或背景。",
    "abstract": "同心轨道与波纹叠加，强调几何秩序与层次。",
}


def build_svg(kind, w, h, hue, sat, rnd):
    p = palette_of(hue, sat)
    fn = rnd.choice(TEMPLATES[kind])
    body = fn(w, h, p, rnd)
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        "<defs>",
        f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">',
        f'<stop offset="0%" stop-color="{p["deep"]}"/>',
        f'<stop offset="55%" stop-color="{p["mid"]}"/>',
        f'<stop offset="100%" stop-color="{p["deep"]}"/>',
        "</linearGradient>",
        f'<radialGradient id="glow" cx="50%" cy="45%" r="70%">',
        f'<stop offset="0%" stop-color="{p["bright"]}" stop-opacity="0.35"/>',
        f'<stop offset="100%" stop-color="{p["bright"]}" stop-opacity="0"/>',
        "</radialGradient>",
        "</defs>",
    ]
    svg += body
    svg.append(f'<rect width="{w}" height="{h}" fill="url(#glow)"/>')
    svg.append("</svg>")
    return "\n".join(svg)


def gen_gallery():
    os.makedirs(GALLERY_DIR, exist_ok=True)
    for f in os.listdir(GALLERY_DIR):
        if f.endswith(".svg"):
            os.remove(os.path.join(GALLERY_DIR, f))

    records = []
    sizes = [(1200, 800), (1000, 1250), (1400, 700), (900, 900), (1200, 900)]
    for kind in ["nature", "city", "tech", "abstract"]:
        for i, title in enumerate(TITLES[kind]):
            w, h = sizes[i % len(sizes)]
            hue, sat = PALETTES[(list(TEMPLATES).index(kind) * 2 + i) % len(PALETTES)]
            rnd = random.Random(hash((kind, i)) & 0xFFFF)
            fname = f"{kind}-{i + 1}.svg"
            with open(os.path.join(GALLERY_DIR, fname), "w", encoding="utf-8") as fh:
                fh.write(build_svg(kind, w, h, hue, sat, rnd))
            records.append(
                {
                    "title": title,
                    "category": CATEGORY_CN[kind],
                    "url": f"/gallery/{fname}",
                    "thumb": f"/gallery/{fname}",
                    "w": w,
                    "h": h,
                    "likes": rnd.randint(120, 9800),
                    "desc": DESCS[kind],
                }
            )
    return records


# --------------------------------------------------------------------------
# product + order seed data
# --------------------------------------------------------------------------
CATEGORIES = ["数码电子", "家居生活", "服饰鞋包", "食品生鲜", "运动户外", "美妆个护"]
BRANDS = ["云枢", "岚川", "北屿", "青野", "星渡", "木原", "南屿", "白鲸"]
PROD_WORDS = {
    "数码电子": ["降噪耳机", "智能手表", "便携投影", "机械键盘", "无线充电板", "4K 摄像头", "蓝牙音箱", "移动固态硬盘"],
    "家居生活": ["记忆棉枕", "香薰加湿器", "折叠收纳箱", "陶瓷餐具组", "记忆棉床垫", "落地氛围灯", "硅藻土地垫", "全棉四件套"],
    "服饰鞋包": ["轻量冲锋衣", "真皮通勤包", "针织开衫", "透气跑鞋", "亚麻衬衫", "羊毛围巾", "牛仔直筒裤", "防晒帽"],
    "食品生鲜": ["冷萃咖啡液", "有机山茶油", "手作坚果礼盒", "低温酸奶", "现磨黑芝麻丸", "海盐苏打饼", "冻干水果脆", "原切牛排"],
    "运动户外": ["碳纤维登山杖", "速干运动套装", "露营折叠椅", "战术背包", "瑜伽垫", "骑行头盔", "保温运动水壶", "筋膜枪"],
    "美妆个护": ["氨基酸洁面", "精华水乳套装", "高倍防晒乳", "护发精油", "唇部养护膏", "男士控油套装", "香氛沐浴露", "电动牙刷"],
}
TAGS = ["热销", "新品", "包邮", "限时", "官方直营", "好评如潮", "库存紧张"]


CATEGORY_HUE = {
    "数码电子": 214,
    "家居生活": 158,
    "服饰鞋包": 268,
    "食品生鲜": 28,
    "运动户外": 188,
    "美妆个护": 342,
}


def build_product_svg(name, word, category, sku):
    """按商品名绘制对应的商品图：品类色调渐变 + 对应图形 + 品名。"""
    w = h = 480
    hue = CATEGORY_HUE.get(category, 210)
    bg1 = hsl(hue, 0.42, 0.90)
    bg2 = hsl(hue + 16, 0.50, 0.78)
    c = hsl(hue, 0.62, 0.34)
    a = hsl(hue + 24, 0.72, 0.66)
    parts = icon_for(word, category)(c, a)
    # 图形绘制在 100x100 坐标系，缩放到画布中部
    size = 300
    ox, oy = (w - size) / 2, (h - size) / 2 - 24
    body = "\n".join(
        f'<g transform="translate({ox:.0f},{oy:.0f}) scale({size / 100:.2f})">{p}</g>' for p in parts
    )
    return "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
            "<defs>",
            f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
            f'<stop offset="0%" stop-color="{bg1}"/>',
            f'<stop offset="100%" stop-color="{bg2}"/>',
            "</linearGradient>",
            "</defs>",
            f'<rect width="{w}" height="{h}" fill="url(#bg)"/>',
            f'<circle cx="{w/2:.0f}" cy="{oy + size/2:.0f}" r="{size*0.52:.0f}" fill="#ffffff" opacity="0.55"/>',
            body,
            (
                f'<text x="{w/2:.0f}" y="{h - 34}" text-anchor="middle" '
                f'font-family="system-ui, \'Microsoft YaHei\', \'PingFang SC\', sans-serif" '
                f'font-size="30" font-weight="600" fill="{c}">{name}</text>'
            ),
            "</svg>",
        ]
    )


def gen_product_images(products):
    os.makedirs(PRODUCT_DIR, exist_ok=True)
    for f in os.listdir(PRODUCT_DIR):
        if f.endswith(".svg"):
            os.remove(os.path.join(PRODUCT_DIR, f))
    for p in products:
        fname = f"{p['sku']}.svg"
        with open(os.path.join(PRODUCT_DIR, fname), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(build_product_svg(p["name"], p["word"], p["category"], p["sku"]))
    return len(products)


def gen_products():
    rows = []
    idx = 0
    for cat in CATEGORIES:
        for word in PROD_WORDS[cat]:
            idx += 1
            rnd = random.Random(idx * 7919)
            # 品牌与品名前缀必须一致，避免出现「品名前缀 ≠ 品牌」的错误数据
            brand = BRANDS[(idx * 3 + list(CATEGORIES).index(cat)) % len(BRANDS)]
            sku = f"SKU-{cat[:2].encode('utf-8').hex()[:4].upper()}-{idx:04d}"
            rows.append(
                {
                    "name": f"{brand} {word}",
                    "word": word,
                    "sku": sku,
                    "category": cat,
                    "brand": brand,
                    "price": round(rnd.uniform(19, 4999), 2),
                    "stock": rnd.randint(0, 2400),
                    "sales": rnd.randint(12, 18000),
                    "rating": round(rnd.uniform(3.6, 5.0), 1),
                    "status": 1 if rnd.random() > 0.16 else 0,
                    "cover": f"/products/{sku}.svg",
                    "tags": "、".join(rnd.sample(TAGS, rnd.randint(1, 3))),
                }
            )
    return rows


REGIONS = ["华东", "华南", "华北", "西南", "华中", "东北"]
CHANNELS = ["小程序", "App", "PC 官网", "第三方平台", "线下门店"]


def gen_orders(days=45):
    rows = []
    today = datetime.date.today()
    oid = 0
    for d in range(days):
        day = today - datetime.timedelta(days=days - 1 - d)
        weekend = day.weekday() >= 5
        for _ in range(14):
            oid += 1
            rnd = random.Random(d * 1000 + oid)
            cat = rnd.choice(CATEGORIES)
            qty = rnd.randint(3, 90)
            unit = round(rnd.uniform(25, 1200), 2)
            amount = round(qty * unit * (1.15 if weekend else 1.0), 2)
            rows.append(
                {
                    "date": day.isoformat(),
                    "category": cat,
                    "region": rnd.choice(REGIONS),
                    "channel": rnd.choice(CHANNELS),
                    "amount": amount,
                    "quantity": qty,
                }
            )
    return rows


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "''")


def write_sql(products, galleries, orders):
    out = [
        "-- ============================================================",
        "-- Phase 2 demo seed data (generated by scripts/gen_demo_assets.py)",
        "-- Safe to re-run: tables are truncated before insert.",
        "-- ============================================================",
        "",
        "CREATE TABLE IF NOT EXISTS demo_product (",
        "  id         BIGINT AUTO_INCREMENT PRIMARY KEY,",
        "  name       VARCHAR(128) NOT NULL COMMENT '商品名称',",
        "  sku        VARCHAR(64)  NOT NULL COMMENT '货号',",
        "  category   VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '品类',",
        "  brand      VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '品牌',",
        "  price      DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '价格',",
        "  stock      INT NOT NULL DEFAULT 0 COMMENT '库存',",
        "  sales      INT NOT NULL DEFAULT 0 COMMENT '销量',",
        "  rating     DECIMAL(3,2) NOT NULL DEFAULT 4.5 COMMENT '评分',",
        "  status     TINYINT NOT NULL DEFAULT 1 COMMENT '1上架 0下架',",
        "  cover      VARCHAR(255) NOT NULL DEFAULT '' COMMENT '封面图',",
        "  tags       VARCHAR(128) NOT NULL DEFAULT '' COMMENT '标签',",
        "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,",
        "  KEY idx_category (category),",
        "  KEY idx_status (status)",
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='demo 商品';",
        "",
        "CREATE TABLE IF NOT EXISTS demo_gallery (",
        "  id          BIGINT AUTO_INCREMENT PRIMARY KEY,",
        "  title       VARCHAR(128) NOT NULL COMMENT '标题',",
        "  category    VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '分类',",
        "  url         VARCHAR(255) NOT NULL COMMENT '原图地址',",
        "  thumb       VARCHAR(255) NOT NULL DEFAULT '' COMMENT '缩略图',",
        "  width       INT NOT NULL DEFAULT 1200 COMMENT '宽度',",
        "  height      INT NOT NULL DEFAULT 800 COMMENT '高度',",
        "  likes       INT NOT NULL DEFAULT 0 COMMENT '点赞数',",
        "  description VARCHAR(255) NOT NULL DEFAULT '' COMMENT '描述',",
        "  status      TINYINT NOT NULL DEFAULT 1 COMMENT '1显示 0隐藏',",
        "  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "  KEY idx_category (category)",
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='demo 图库';",
        "",
        "CREATE TABLE IF NOT EXISTS demo_order (",
        "  id         BIGINT AUTO_INCREMENT PRIMARY KEY,",
        "  order_date DATE NOT NULL COMMENT '订单日期',",
        "  category   VARCHAR(32) NOT NULL DEFAULT '' COMMENT '品类',",
        "  region     VARCHAR(32) NOT NULL DEFAULT '' COMMENT '区域',",
        "  channel    VARCHAR(32) NOT NULL DEFAULT '' COMMENT '渠道',",
        "  amount     DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '金额',",
        "  quantity   INT NOT NULL DEFAULT 0 COMMENT '件数',",
        "  KEY idx_date (order_date),",
        "  KEY idx_category (category)",
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='demo 订单事实表';",
        "",
        "TRUNCATE TABLE demo_product;",
        "TRUNCATE TABLE demo_gallery;",
        "TRUNCATE TABLE demo_order;",
        "",
    ]

    if products:
        out.append(
            "INSERT INTO demo_product (name, sku, category, brand, price, stock, sales, rating, status, cover, tags) VALUES"
        )
        vals = []
        for i, p in enumerate(products):
            comma = "," if i < len(products) - 1 else ";"
            vals.append(
                "  ('%s', '%s', '%s', '%s', %.2f, %d, %d, %.2f, %d, '%s', '%s')%s"
                % (
                    esc(p["name"]),
                    p["sku"],
                    p["category"],
                    p["brand"],
                    p["price"],
                    p["stock"],
                    p["sales"],
                    p["rating"],
                    p["status"],
                    p["cover"],
                    esc(p["tags"]),
                    comma,
                )
            )
        out += vals
        out.append("")

    if galleries:
        out.append(
            "INSERT INTO demo_gallery (title, category, url, thumb, width, height, likes, description, status) VALUES"
        )
        vals = []
        for i, g in enumerate(galleries):
            comma = "," if i < len(galleries) - 1 else ";"
            vals.append(
                "  ('%s', '%s', '%s', '%s', %d, %d, %d, '%s', 1)%s"
                % (
                    esc(g["title"]),
                    g["category"],
                    g["url"],
                    g["thumb"],
                    g["w"],
                    g["h"],
                    g["likes"],
                    esc(g["desc"]),
                    comma,
                )
            )
        out += vals
        out.append("")

    if orders:
        out.append(
            "INSERT INTO demo_order (order_date, category, region, channel, amount, quantity) VALUES"
        )
        vals = []
        for i, o in enumerate(orders):
            comma = "," if i < len(orders) - 1 else ";"
            vals.append(
                "  ('%s', '%s', '%s', '%s', %.2f, %d)%s"
                % (
                    o["date"],
                    o["category"],
                    o["region"],
                    o["channel"],
                    o["amount"],
                    o["quantity"],
                    comma,
                )
            )
        out += vals
        out.append("")

    with open(SQL_OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(out))
    return len(products), len(galleries), len(orders)


if __name__ == "__main__":
    galleries = gen_gallery()
    products = gen_products()
    orders = gen_orders()
    nimg = gen_product_images(products)
    np_, ng, no = write_sql(products, galleries, orders)
    print(f"svg={len(galleries)} products={np_} product-images={nimg} orders={no}")
    print(f"gallery  -> {GALLERY_DIR}")
    print(f"products -> {PRODUCT_DIR}")
    print(f"sql      -> {SQL_OUT}")
