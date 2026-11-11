# MIND – App-Symbol als PNG erzeugen (für Home-Bildschirm, Installieren und Benachrichtigungen).
# Das Symbol ist der Tagesring aus der App: dunkler Grund, Ring zu drei Vierteln in Koralle.
# Dieselbe Zeichnung steht als public/icons/icon.svg im Repo. Aendert sich das Symbol, beide anpassen.
# Aufruf im Code-Ordner:  python3 docs/icons.py   (braucht Pillow: pip3 install pillow)
import math
from PIL import Image, ImageDraw

BG, TRACK, ACC = "#141319", "#2A2933", "#FF7A59"
S = 4  # viermal so gross zeichnen und dann verkleinern, damit die Kanten glatt werden

def icon(size, rounded):
    n = size * S
    u = n / 512  # die Zeichnung ist auf 512 x 512 angelegt
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=112 * u, fill=BG)
    else:
        d.rectangle([0, 0, n, n], fill=BG)
    c, r, w = 256 * u, 120 * u, 44 * u
    box = [c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2]
    d.arc(box, 0, 360, fill=TRACK, width=round(w))
    d.arc(box, -90, 180, fill=ACC, width=round(w))  # von oben im Uhrzeigersinn, drei Viertel
    for deg in (-90, 180):  # runde Enden
        x, y = c + r * math.cos(math.radians(deg)), c + r * math.sin(math.radians(deg))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=ACC)
    return img.resize((size, size), Image.LANCZOS)

icon(192, True).save("public/icons/icon-192.png", optimize=True)
icon(512, True).save("public/icons/icon-512.png", optimize=True)
icon(512, False).convert("RGB").save("public/icons/maskable-512.png", optimize=True)       # Android schneidet selbst zu
icon(180, False).convert("RGB").save("public/icons/apple-touch-icon.png", optimize=True)   # iPhone rundet selbst ab
