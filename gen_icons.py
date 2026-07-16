import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
CANVAS = 512  # se genera en alta resolución y se reescala para que quede nítido

VIOLET = (124, 92, 252, 255)  # #7C5CFC
WHITE = (255, 255, 255, 255)


def rounded_square(size, radius, color):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=color)
    return img


def draw_pip_glyph(img, margin_ratio=0.22):
    """Dibuja el glifo clásico de Picture-in-Picture: un marco grande (la
    página) con un rectángulo relleno más pequeño superpuesto abajo a la
    derecha (la ventana flotante)."""
    draw = ImageDraw.Draw(img)
    size = img.size[0]
    margin = int(size * margin_ratio)

    # Marco grande (contorno).
    frame_stroke = max(6, int(size * 0.045))
    frame_radius = int(size * 0.08)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=frame_radius,
        outline=WHITE,
        width=frame_stroke,
    )

    # Ventana flotante (relleno), superpuesta en la esquina inferior derecha.
    pip_w = int(size * 0.34)
    pip_h = int(size * 0.24)
    pip_x1 = size - margin - int(size * 0.02)
    pip_y1 = size - margin - int(size * 0.02)
    pip_x0 = pip_x1 - pip_w
    pip_y0 = pip_y1 - pip_h
    draw.rounded_rectangle(
        [pip_x0, pip_y0, pip_x1, pip_y1],
        radius=int(size * 0.035),
        fill=WHITE,
    )


def make_master():
    radius = int(CANVAS * 0.22)
    img = rounded_square(CANVAS, radius, VIOLET)
    draw_pip_glyph(img)
    return img


def main():
    master = make_master()
    for size in (16, 32, 48, 128):
        resized = master.resize((size, size), Image.LANCZOS)
        resized.save(f"{OUT_DIR}/icon{size}.png")
        print(f"icon{size}.png OK")


if __name__ == "__main__":
    main()
