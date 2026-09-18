"""Angle as rotation

Why sine and cosine arise from rotation: a point P rotates on the unit circle; its horizontal
and vertical shadows are cos θ and sin θ. OrbBits Manim conventions: docs/style/manim.md.
"""

from manim import *  # noqa: F403  (Manim idiom: scenes use the global namespace)

PRIMARY = BLUE
ACCENT = YELLOW
COS_COLOR = RED
SIN_COLOR = TEAL
MUTED = GREY_B

R = 2.4  # on-screen radius of the unit circle


class AngleAsRotation(Scene):
    def construct(self):
        title = Text("Angolo come rotazione", font_size=40).to_edge(UP)
        self.play(FadeIn(title))

        # Stage: axes and the unit circle, slightly to the left to leave room for the readout.
        origin = LEFT * 2.2 + DOWN * 0.4
        axes = Axes(
            x_range=[-1.4, 1.4, 1], y_range=[-1.4, 1.4, 1],
            x_length=2 * 1.4 * R, y_length=2 * 1.4 * R,
            axis_config={"color": MUTED, "include_ticks": False, "include_tip": True, "tip_width": 0.15, "tip_height": 0.15},
        ).move_to(origin)
        circle = Circle(radius=R, color=PRIMARY, stroke_width=3).move_to(origin)
        self.play(Create(axes), Create(circle))

        theta = ValueTracker(0.0)

        def p_pos():
            t = theta.get_value()
            return origin + R * np.array([np.cos(t), np.sin(t), 0])

        radius = always_redraw(lambda: Line(origin, p_pos(), color=ACCENT, stroke_width=4))
        point = always_redraw(lambda: Dot(p_pos(), color=ACCENT, radius=0.09))
        p_label = always_redraw(
            lambda: MathTex("P", font_size=36, color=ACCENT).next_to(p_pos(), normalize(p_pos() - origin), buff=0.12)
        )

        foot_x = lambda: np.array([p_pos()[0], origin[1], 0])  # noqa: E731
        foot_y = lambda: np.array([origin[0], p_pos()[1], 0])  # noqa: E731
        drop_x = always_redraw(lambda: DashedLine(p_pos(), foot_x(), color=MUTED, stroke_width=2))
        drop_y = always_redraw(lambda: DashedLine(p_pos(), foot_y(), color=MUTED, stroke_width=2))
        cos_seg = always_redraw(lambda: Line(origin, foot_x(), color=COS_COLOR, stroke_width=8))
        sin_seg = always_redraw(lambda: Line(origin, foot_y(), color=SIN_COLOR, stroke_width=8))

        def angle_arc():
            t = theta.get_value()
            if t < 1e-3:
                return VMobject()
            return Arc(radius=0.55, start_angle=0, angle=t, arc_center=origin, color=ACCENT, stroke_width=3)

        arc = always_redraw(angle_arc)
        theta_label = always_redraw(
            lambda: MathTex(r"\theta", font_size=36, color=ACCENT).move_to(
                origin + 0.85 * np.array([np.cos(theta.get_value() / 2), np.sin(theta.get_value() / 2), 0])
            ).set_opacity(1 if theta.get_value() > 0.3 else 0)
        )

        self.play(Create(radius), FadeIn(point, p_label))
        self.wait(0.5)

        # Readout on the right: cos θ and sin θ as live numbers.
        readout = VGroup(
            MathTex(r"\cos\theta =", color=COS_COLOR, font_size=40),
            DecimalNumber(1, num_decimal_places=2, color=COS_COLOR, font_size=40),
            MathTex(r"\sin\theta =", color=SIN_COLOR, font_size=40),
            DecimalNumber(0, num_decimal_places=2, color=SIN_COLOR, font_size=40),
        ).arrange_in_grid(rows=2, cols=2, col_alignments="rl", buff=(0.25, 0.5)).move_to(RIGHT * 3.6 + DOWN * 0.4)
        readout[1].add_updater(lambda m: m.set_value(np.cos(theta.get_value())))
        readout[3].add_updater(lambda m: m.set_value(np.sin(theta.get_value())))

        self.play(FadeIn(drop_x, drop_y), Create(cos_seg), Create(sin_seg), FadeIn(arc, theta_label))
        self.play(FadeIn(readout))
        self.wait(0.5)

        # The core idea: rotate, and watch the two shadows breathe.
        self.play(theta.animate.set_value(PI / 3), run_time=2.5, rate_func=smooth)
        self.wait(0.8)
        self.play(theta.animate.set_value(5 * PI / 6), run_time=2.5, rate_func=smooth)
        self.wait(0.8)
        self.play(theta.animate.set_value(3 * PI / 2), run_time=3, rate_func=smooth)
        self.wait(0.8)
        self.play(theta.animate.set_value(TAU), run_time=2.5, rate_func=smooth)
        self.wait(0.5)

        coords = MathTex(r"P = (\cos\theta,\ \sin\theta)", font_size=44).next_to(readout, DOWN, buff=1.0)
        coords[0][3:8].set_color(COS_COLOR)
        coords[0][9:14].set_color(SIN_COLOR)
        self.play(Write(coords))
        self.wait(2)
