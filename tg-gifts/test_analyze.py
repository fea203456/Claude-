import analyze


def L(stars, **kw):
    return {"slug": f"g-{stars}", "num": stars, "stars": stars, **kw}


def test_break_even():
    assert round(analyze.break_even(100, 0.20), 2) == 125.0
    assert round(analyze.break_even(100, 0.10), 2) == 111.11


def test_net_profit():
    assert analyze.net_profit(100, 150, 0.20) == 20.0
    assert analyze.net_profit(100, 150, 0.20, extra=25) == -5.0


def test_underpriced_found():
    hit = analyze.find_underpriced([L(600), L(1000), L(1010), L(1020)], fee=0.20)
    assert hit and hit["listing"]["stars"] == 600
    assert hit["ref_price"] == 1010
    # 1010*0.99*0.8 - 600 = 199.92
    assert round(hit["profit"], 2) == 199.92


def test_underpriced_gap_eaten_by_fee():
    # разрыв 20% при комиссии 20% — прибыли нет
    assert analyze.find_underpriced([L(800), L(1000), L(1000), L(1000)], fee=0.20) is None


def test_underpriced_thin_book():
    assert analyze.find_underpriced([L(100), L(1000)], fee=0.20) is None


def test_rare_near_floor():
    hits = analyze.find_rare_near_floor([
        L(1000, model="A", model_permille=200),
        L(1100, model="B", model_permille=5),
        L(2000, model="C", model_permille=1),   # редкий, но далеко от флора
    ])
    assert [h["listing"]["stars"] for h in hits] == [1100]


def test_floor_drop():
    assert analyze.floor_drop([1000, 1000, 1010, 990], 800)["drop_pct"] == 20.0
    assert analyze.floor_drop([1000, 1000, 1010, 990], 950) is None
    assert analyze.floor_drop([1000], 500) is None
