"""__BIT_TITLE__

OrbBits Manim conventions (see docs/style/manim.md):
- one main Scene per Bit, 16:9, rendered at 1080p60 by `orbbits build`;
- dark background, restrained palette, large readable labels;
- animate one idea at a time and leave short pauses for the teacher to talk.
"""

from manim import *  # noqa: F403  (Manim idiom: scenes use the global namespace)

ACCENT = YELLOW
PRIMARY = BLUE


class __BIT_CLASS__(Scene):
    def construct(self):
        title = Text("__BIT_TITLE__", font_size=40).to_edge(UP)
        self.play(FadeIn(title))
        self.wait(0.5)

        circle = Circle(radius=2, color=PRIMARY).move_to(ORIGIN)
        point = Dot(circle.point_at_angle(0), color=ACCENT)
        label = MathTex(r"P(\cos\theta,\ \sin\theta)", font_size=36).next_to(circle, DOWN)

        self.play(Create(circle))
        self.play(FadeIn(point), Write(label))
        self.wait(0.5)

        # Move the point around the circle: the core idea, shown slowly.
        self.play(point.animate.move_to(circle.point_at_angle(2.0)), run_time=2)
        self.wait(1)

        self.play(FadeOut(point, label, circle, title))
        self.wait(0.5)
