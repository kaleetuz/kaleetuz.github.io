"""kaleet.uz/e/<id>/ — har bir faol e'lon uchun sahifa (Telegram/WhatsApp ko'rinishi uchun og: teglari bilan).
GitHub Actions har 10 daqiqada ishga tushiradi. Faqat ochiq (publishable) kalit ishlatiladi."""
import json, os, re, shutil, sys, urllib.request, html

SB = "https://mbtswvehjtmcheocgosf.supabase.co"
KEY = "sb_publishable_ZVv4y53suvbbAI7UXZdwTw_kkvlGnTm"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = os.path.join(ROOT, "e")
COLS = "id,deal,category,title,price,address,details,rooms,repair,amenities,note,image,images,gradient"

def get(cols, off):
    u = f"{SB}/rest/v1/listings?select={cols}&status=eq.active&order=id.asc&limit=1000&offset={off}"
    with urllib.request.urlopen(urllib.request.Request(u, headers={"apikey": KEY}), timeout=60) as r:
        return json.loads(r.read())

def fetch_all():
    cols, rows, off = COLS, [], 0
    while True:
        try: page = get(cols, off)
        except urllib.error.HTTPError as e:
            if b"deal" in e.read() and "deal," in cols: cols = cols.replace("deal,", ""); continue
            raise
        rows += page
        if len(page) < 1000: return rows
        off += 1000

def main():
    tpl = open(os.path.join(E, "index.html"), encoding="utf-8").read()
    rows = fetch_all()
    keep = set()
    for l in rows:
        lid = str(int(l["id"])); keep.add(lid)
        rent = l.get("deal") == "rent"
        imgs = [u for u in (l.get("images") or []) if str(u).startswith("https://")] or ([l["image"]] if str(l.get("image") or "").startswith("https://") else [])
        img = imgs[0] if imgs else "https://kaleet.uz/assets/apple-touch-icon.png"
        title = f'{l["title"]} — {l["price"]}' + (" / oy" if rent else "")
        desc = " · ".join(x for x in [("Ijara" if rent else ""), l.get("address") or "", l.get("details") or ""] if x)
        a = lambda s: html.escape(str(s), quote=True)
        og = (f'<title>{a(title)} · Kaleet</title>\n<meta name="description" content="{a(desc)}">\n'
              f'<meta property="og:type" content="website">\n<meta property="og:site_name" content="Kaleet">\n'
              f'<meta property="og:url" content="https://kaleet.uz/e/{lid}/">\n<meta property="og:title" content="{a(title)}">\n'
              f'<meta property="og:description" content="{a(desc)}">\n<meta property="og:image" content="{a(img)}">\n'
              f'<meta name="twitter:card" content="summary_large_image">')
        page = re.sub(r"<!--OG-->.*?<!--/OG-->", lambda m: og, tpl, count=1, flags=re.S)
        page = page.replace("<title>Kaleet — e'lon</title>\n", "", 1)
        data = json.dumps(l, ensure_ascii=False).replace("</", "<\\/")
        page = page.replace("/*DATA*/null/*/DATA*/", data, 1)
        d = os.path.join(E, lid); os.makedirs(d, exist_ok=True)
        f = os.path.join(d, "index.html")
        old = open(f, encoding="utf-8").read() if os.path.exists(f) else None
        if old != page: open(f, "w", encoding="utf-8").write(page)
    # Yopilgan / o'chirilgan e'lonlar sahifasi olib tashlanadi (havola /e/?id= ga o'tib "topilmadi" deydi)
    for n in os.listdir(E):
        if n.isdigit() and n not in keep: shutil.rmtree(os.path.join(E, n))
    print(f"{len(keep)} ta sahifa")

if __name__ == "__main__":
    main()
