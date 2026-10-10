"""Dibuja las piezas de HilarAvatar que se hacen mejor con cuentas que a mano.

Patillas, barba completa, de tres días y candado; afro, coronilla, cresta,
rizos y trenza; y la diadema. Son piezas con formas repetidas (las ondas del
afro, los puntos de la barba de tres días, los gajos de la trenza) o que
tienen que salir simétricas, y se redibujaron porque tenían fallos: patillas
que tapaban los ojos, una barba que tapaba la boca, un afro de manchas…

Escribe sus SVG en hilaravatar/piezas, que es el origen; después hay que
regenerar piezas.js con `npm run piezas`. Ojo: si una de estas piezas se
retoca a mano en su SVG, al volver a ejecutar esto se pierde el retoque.

    python3 scripts/redibujar.py && npm run piezas
"""

import math
import random
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "hilaravatar" / "piezas"
TINTA = "var(--dh-tinta, #1B1714)"
PELO = "var(--dh-pelo, #2C2422)"
PELO_SOMBRA = "var(--dh-pelo-sombra, #1A1412)"
PIEL = "var(--dh-piel, #E8B58C)"
ROPA = "var(--dh-ropa, #CF3A2B)"
TRAZO = 'stroke-linecap="round" stroke-linejoin="round"'


def n(x):
    """Número corto para el SVG."""
    return f"{x:.1f}".rstrip("0").rstrip(".")


def escribir(cat, pieza, fragmento):
    """Cambia la pieza de un SVG conservando su cabecera y sus <defs>."""
    ruta = RAIZ / cat / f"{pieza}.svg"
    svg = ruta.read_text()
    fin_defs = svg.index("</defs>") + len("</defs>")
    ruta.write_text(svg[:fin_defs] + "\n" + fragmento.strip() + "\n</svg>\n")
    print("redibujada", cat, pieza)


def espejo(d):
    """El mismo trazado reflejado respecto al centro (x → 512 − x).

    Solo comandos absolutos: en M L C Q S T las x son los números pares; en H
    todos; en A, la x final, y el sentido del arco se invierte.
    """
    salida = []
    for cmd, args in re.findall(r"([A-Za-z])([^A-Za-z]*)", d):
        nums = [float(v) for v in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", args)]
        if cmd in "MLCQST":
            nums = [512 - v if k % 2 == 0 else v for k, v in enumerate(nums)]
        elif cmd == "H":
            nums = [512 - v for v in nums]
        elif cmd == "A":
            for k in range(0, len(nums), 7):
                nums[k + 4] = 1 - nums[k + 4]
                nums[k + 5] = 512 - nums[k + 5]
        elif cmd not in "VZ":
            raise ValueError(f"espejo: comando relativo {cmd} en {d}")
        salida.append(cmd + " ".join(n(v) for v in nums))
    return " ".join(salida)


# ------------------------------------------------------------ patillas --
# Pegadas al borde de la cara: el generador las redibuja para cada cabeza
# siguiendo su borde y las estrecha junto a los ojos (data-pegado). Se
# recortan por la cara y el contorno se vuelve a trazar encima. Empiezan
# afiladas bajo el pelo, se ensanchan bajo el ojo y acaban en un corte en
# diagonal a la altura de la oreja.
PATILLA = "M130 178 L164 182 C172 196 174 214 174 232 C175 252 181 270 187 284 L150 300 L130 300 Z"
escribir("barba", "patillas", f"""
<g class="dh-barba">
  <g data-recorte="cara">
    <g data-pegado="cara-izquierda"><path d="{PATILLA}" fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}/></g>
    <g data-pegado="cara-derecha"><path d="{espejo(PATILLA)}" fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}/></g>
  </g>
  <path data-repaso="cara"/>
</g>""")

# ------------------------------------------------------------ completa --
# El cuerpo, recortado por la cara (encaja en todas las cabezas), con un
# hueco de piel donde va la boca: se pinta antes que la boca, así que la boca
# se ve siempre. El bigote va aparte, encima de la boca.
BARBA = (
    "M112 228 L160 236 C168 262 188 284 212 292 Q234 288 256 289 "
    "Q278 288 300 292 C324 284 344 262 352 236 L400 228 L400 392 L112 392 Z"
)
HUECO = "M216 300 Q256 290 296 300 Q300 324 256 334 Q212 324 216 300 Z"
BIGOTE_COMPLETA = (
    "M256 288 Q232 276 210 284 Q200 298 214 302 Q238 304 256 294 "
    "Q274 304 298 302 Q312 298 302 284 Q280 276 256 288 Z"
)
MECHONES = " ".join(
    f"M{n(x)} {n(y)} q{n(dx)} {n(dy)} {n(2 * dx)} {n(dy * 0.4)}"
    for x, y, dx, dy in [
        (186, 300, 5, 8), (196, 322, 6, 8), (226, 344, 5, 7),
        (326, 300, -5, 8), (316, 322, -6, 8), (286, 344, -5, 7), (252, 348, 4, 6),
    ]
)
escribir("barba", "completa", f"""
<g class="dh-barba">
  <g data-recorte="cara">
    <path d="{BARBA}" fill="{PELO}" stroke="{TINTA}" stroke-width="7" {TRAZO}/>
    <path d="{MECHONES}" fill="none" stroke="{PELO_SOMBRA}" stroke-width="4" {TRAZO} opacity="0.7"/>
    <path d="{HUECO}" fill="{PIEL}" stroke="{TINTA}" stroke-width="5" {TRAZO}/>
  </g>
  <path data-repaso="cara"/>
  <g class="dh-bigote">
    <path d="{BIGOTE_COMPLETA}" fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}/>
  </g>
</g>""")

# ----------------------------------------------------------- tres días --
# Sombra de barba translúcida, recortada por la cara, y puntitos sueltos.
# Sin ningún punto encima de la boca ni de la nariz.
SOMBRA = (
    "M112 230 L160 238 C170 262 192 282 214 288 Q236 282 256 284 "
    "Q276 282 298 288 C320 282 342 262 352 238 L400 230 L400 392 L112 392 Z"
)
azar = random.Random(7)
puntos = []
while len(puntos) < 34:
    x, y = azar.uniform(166, 256), azar.uniform(262, 350)
    # dentro de la zona (bajo la línea de la mejilla, lejos del centro de la boca)
    mejilla = 238 + (x - 160) * 0.95
    if y < mejilla or (226 < x and 288 < y < 336):
        continue
    r = azar.uniform(1.6, 2.6)
    puntos.append((x, y, r))
CIRCULOS = "".join(
    f'<circle cx="{n(px)}" cy="{n(y)}" r="{n(r)}"/>'
    for x, y, r in puntos
    for px in (x, 512 - x + azar.uniform(-3, 3))
)
escribir("barba", "tres-dias", f"""
<g class="dh-barba">
  <g data-recorte="cara">
    <path d="{SOMBRA}" fill="{PELO}" stroke="none" opacity="0.16"/>
    <g fill="{PELO}" stroke="none" opacity="0.55">{CIRCULOS}</g>
  </g>
</g>""")

# ---------------------------------------------------------------- afro --
# Una nube de rizos. Detrás de la cabeza, el volumen: el contorno en ondas
# y, dentro, rizos sueltos en forma de arco (antes eran manchas redondas).
# Delante, la parte de arriba de la cabeza, sin contorno (se funde con la
# nube), y el nacimiento del pelo en ondas, con su línea de tinta.


def ondas(cx, cy, rx, ry, cuantas, alto, desde=0.0, hasta=2 * math.pi):
    """Contorno en ondas sobre una elipse entre dos ángulos (0 = derecha,
    sentido horario en pantalla). `alto` > 0 abomba hacia fuera."""
    pasos = []
    for i in range(cuantas + 1):
        a = desde + (hasta - desde) * i / cuantas
        pasos.append((cx + rx * math.cos(a), cy + ry * math.sin(a), a))
    d = f"M{n(pasos[0][0])} {n(pasos[0][1])}"
    for (_x0, _y0, a0), (x1, y1, a1) in zip(pasos, pasos[1:]):
        am = (a0 + a1) / 2
        k = 1 + alto / ((rx + ry) / 2)
        d += f" Q{n(cx + rx * k * math.cos(am))} {n(cy + ry * k * math.sin(am))} {n(x1)} {n(y1)}"
    return d


def rizo(x, y, radio, hacia):
    """Un rizo: un arco corto abombado hacia `hacia` (grados)."""
    a0, a1 = math.radians(hacia - 65), math.radians(hacia + 65)
    return (
        f"M{n(x + radio * math.cos(a0))} {n(y + radio * math.sin(a0))} "
        f"A{n(radio)} {n(radio)} 0 0 1 {n(x + radio * math.cos(a1))} {n(y + radio * math.sin(a1))}"
    )


def rizos_en_anillo(cx, cy, r, grados, radio=10):
    """Rizos repartidos por un anillo, cada uno mirando hacia fuera."""
    return " ".join(
        rizo(cx + r * math.cos(math.radians(g)), cy + r * math.sin(math.radians(g)), radio, g)
        for g in grados
    )


CENTRO = (256, 200)
NUBE = ondas(*CENTRO, 152, 150, 24, 30) + " Z"
RIZOS_TRAS = " ".join([
    rizos_en_anillo(*CENTRO, 136, range(135, 230, 15)),
    rizos_en_anillo(*CENTRO, 136, range(310, 406, 15)),
    rizos_en_anillo(*CENTRO, 112, [150, 172, 194, 346, 368, 390], 9),
    rizos_en_anillo(*CENTRO, 140, range(238, 303, 16), 9),
])
escribir("pelo-tras", "afro", f"""
<g class="dh-pelo-tras" data-ajuste="craneo">
  <path d="{NUBE}" fill="{PELO}" stroke="{TINTA}" stroke-width="9" {TRAZO}/>
  <path d="{RIZOS_TRAS}" fill="none" stroke="{PELO_SOMBRA}" stroke-width="5" {TRAZO} opacity="0.8"/>
</g>""")

# Delante: el nacimiento del pelo, una elipse en ondas de sien a sien que
# abomban hacia la frente (rizos que caen), y por arriba la cabeza tapada.
NACIMIENTO = ondas(256, 238, 110, 62, 8, -12, math.pi, 2 * math.pi)
ARRIBA = "C380 140 330 78 256 78 C182 78 132 140 146 238"
RIZOS_DELANTE = " ".join([
    " ".join(rizo(256 + 92 * math.cos(math.radians(g)), 238 + 88 * math.sin(math.radians(g)), 9, g)
             for g in range(200, 341, 20)),
    " ".join(rizo(256 + 70 * math.cos(math.radians(g)), 238 + 118 * math.sin(math.radians(g)), 9, g)
             for g in range(230, 311, 26)),
])
escribir("pelo", "afro", f"""
<g class="dh-pelo" data-ajuste="craneo">
  <path d="{NACIMIENTO} L366 238 {ARRIBA} Z" fill="{PELO}" stroke="none"/>
  <path d="{RIZOS_DELANTE}" fill="none" stroke="{PELO_SOMBRA}" stroke-width="5" {TRAZO} opacity="0.8"/>
  <path d="{NACIMIENTO}" fill="none" stroke="{TINTA}" stroke-width="8" {TRAZO}/>
</g>""")

# ----------------------------------------------------------- coronilla --
# Calvo por arriba y dos mechones sobre las orejas (antes bajaban hasta la
# mandíbula, como unas patillas sueltas).
MECHON = (
    "M166 172 C146 182 136 204 142 230 C146 224 152 224 156 230 "
    "C152 220 156 208 160 204 C158 196 162 184 174 178 Z"
)
escribir("pelo", "coronilla", f"""
<g class="dh-pelo" data-ajuste="craneo">
  <path d="{MECHON}" fill="{PELO}" stroke="{TINTA}" stroke-width="8" {TRAZO}/>
  <path d="{espejo(MECHON)}" fill="{PELO}" stroke="{TINTA}" stroke-width="8" {TRAZO}/>
</g>""")

# ------------------------------------------------------------- diadema --
# Antes era un arco negro: sobre pelo oscuro no se veía. Ahora, una cinta
# del color de la ropa con su contorno de tinta.
ARCO = "M160 206 C158 136 202 104 256 104 C310 104 354 136 352 206"
escribir("sombrero", "diadema", f"""
<g class="dh-sombrero" data-ajuste="craneo">
  <path d="{ARCO}" fill="none" stroke="{TINTA}" stroke-width="18" {TRAZO}/>
  <path d="{ARCO}" fill="none" stroke="{ROPA}" stroke-width="9" {TRAZO}/>
</g>""")

# ------------------------------------------------------------- candado --
# Un aro alrededor de la boca: bigote arriba (encima de la boca) y, debajo de
# ella, la U que baja por las comisuras hasta la barbilla. Antes era una
# mancha con un hueco cuadrado que, con la boca encima, parecía una boca
# abierta enorme.
U_CANDADO = (
    "M208 290 C203 308 205 327 218 339 Q235 353 256 353 Q277 353 294 339 "
    "C307 327 309 308 304 290 L292 299 C294 313 292 323 284 329 "
    "Q271 337 256 337 Q241 337 228 329 C220 323 218 313 220 299 Z"
)
BIGOTE_CANDADO = (
    "M256 286 Q234 277 214 285 Q204 296 216 302 Q238 303 256 294 "
    "Q274 303 296 302 Q308 296 298 285 Q278 277 256 286 Z"
)
escribir("barba", "candado", f"""
<g class="dh-barba">
  <path d="{U_CANDADO}" fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}/>
  <g class="dh-bigote">
    <path d="{BIGOTE_CANDADO}" fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}/>
  </g>
</g>""")

# --------------------------------------------------------------- cresta --
# Una cresta de punta con tres picos que nace en lo alto de la frente (antes
# bajaba hasta las cejas), y los lados rapados en un tono suave.
RAPADO = (
    "M152 214 C150 146 192 104 256 104 C320 104 362 146 360 214 "
    "C352 176 336 150 256 150 C176 150 160 176 152 214 Z"
)
CRESTA = (
    "M226 156 L222 108 L237 120 L240 68 L251 94 L256 40 L261 94 L272 68 "
    "L275 120 L290 108 L286 156 C277 149 267 146 256 146 C245 146 235 149 226 156 Z"
)
escribir("pelo", "cresta", f"""
<g class="dh-pelo" data-ajuste="craneo">
  <path d="{RAPADO}" fill="{PELO}" stroke="none" opacity="0.3"/>
  <path d="{CRESTA}" fill="{PELO}" stroke="{TINTA}" stroke-width="8" {TRAZO}/>
  <path d="M256 138 L256 84 M243 136 L241 104 M269 136 L271 104" fill="none" stroke="{PELO_SOMBRA}" stroke-width="4" {TRAZO} opacity="0.7"/>
</g>""")

# ---------------------------------------------------------------- rizos --
# El mismo contorno en ondas; dentro, rizos en arco en vez de manchas.
CONTORNO_RIZOS = (
    "M150 216 C144 148 190 96 256 96 C322 96 368 148 362 216 "
    "C350 194 338 188 326 194 C318 172 300 168 288 182 "
    "C280 160 262 158 252 174 C242 156 224 158 216 178 "
    "C206 164 188 170 182 192 C168 186 156 196 150 216 Z"
)


def hacia_fuera(x, y, cx=256, cy=210):
    return math.degrees(math.atan2(y - cy, x - cx))


RIZOS_ARRIBA = " ".join(
    rizo(x, y, 10, hacia_fuera(x, y))
    for x, y in [(194, 146), (226, 124), (256, 118), (286, 124), (318, 146),
                 (176, 178), (336, 178), (212, 150), (300, 150), (256, 144)]
)
escribir("pelo", "rizos", f"""
<g class="dh-pelo" data-ajuste="craneo">
  <path d="{CONTORNO_RIZOS}" fill="{PELO}" stroke="{TINTA}" stroke-width="9" {TRAZO}/>
  <path d="{RIZOS_ARRIBA}" fill="none" stroke="{PELO_SOMBRA}" stroke-width="5" {TRAZO} opacity="0.8"/>
</g>""")

MELENA_RIZOS = (
    "M256 96 C346 96 372 168 366 240 C360 312 376 378 352 404 "
    "C336 420 314 408 320 384 C332 322 326 262 316 226 "
    "C296 242 216 242 196 226 C186 262 180 322 192 384 "
    "C198 408 176 420 160 404 C136 378 152 312 146 240 "
    "C140 168 166 96 256 96 Z"
)
RIZOS_MELENA = " ".join(
    [rizo(x, y, 10, 180) for x, y in [(164, 262), (158, 300), (168, 336), (160, 372)]]
    + [rizo(512 - x, y, 10, 0) for x, y in [(164, 262), (158, 300), (168, 336), (160, 372)]]
)
escribir("pelo-tras", "rizos", f"""
<g class="dh-pelo-tras" data-ajuste="craneo">
  <path d="{MELENA_RIZOS}" fill="{PELO}" stroke="{TINTA}" stroke-width="9" {TRAZO}/>
  <path d="{RIZOS_MELENA}" fill="none" stroke="{PELO_SOMBRA}" stroke-width="5" {TRAZO} opacity="0.8"/>
</g>""")

# --------------------------------------------------------------- trenza --
# La trenza: gajos que se cruzan, cada uno inclinado al revés que el
# anterior, más pequeños hacia abajo, con su goma y la punta suelta (antes
# eran tres bolas).
ARCO_TRENZA = (
    "M256 92 C334 92 358 152 352 214 L340 214 C334 160 312 126 256 126 "
    "C200 126 178 160 172 214 L160 214 C154 152 178 92 256 92 Z"
)
gajos = []
for k in range(5):
    cx, cy = 370 + 3 * k, 262 + 25 * k
    rx, ry = 21 - 1.6 * k, 15 - 0.8 * k
    giro = 28 if k % 2 == 0 else -28
    gajos.append(
        f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" transform="rotate({giro} {n(cx)} {n(cy)})"/>'
    )
escribir("pelo-tras", "trenza", f"""
<g class="dh-pelo-tras" data-ajuste="craneo">
  <path d="{ARCO_TRENZA}" fill="{PELO}" stroke="{TINTA}" stroke-width="9" {TRAZO}/>
  <path d="M378 382 L370 410 L380 402 L384 414 L390 400 L398 406 L392 382 Z" fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}/>
  <g fill="{PELO}" stroke="{TINTA}" stroke-width="6" {TRAZO}>{"".join(reversed(gajos))}</g>
  <rect x="373" y="372" width="24" height="12" rx="5" fill="{ROPA}" stroke="{TINTA}" stroke-width="5"/>
</g>""")
