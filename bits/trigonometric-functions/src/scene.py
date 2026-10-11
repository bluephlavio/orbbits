"""Sine, cosine and tangent as the coordinates of two moving points.

A single angle drives the geometry and the evaluated coordinate expressions.
OrbBits Manim conventions: docs/style/manim.md.
"""

from manim import *  # noqa: F403
from scipy.interpolate import PchipInterpolator

PRIMARY = BLUE
ACCENT = YELLOW
COS_COLOR = RED
SIN_COLOR = TEAL
TAN_COLOR = PURPLE
MUTED = GREY_B
R = 2.3
LABEL_DISTANCE = 0.50  # same point-to-label-center distance for P and Q

# Authored angular paths: P stays outside the circle, Q stays right of x=1.
# P's initial upper-right sector separates it from Q even when the points coincide;
# after 20° it turns upward to clear the extended radius. PCHIP gives continuous
# angular velocity without overshooting sectors. Neither path changes the distance.
def angular_path(angles, directions):
    spline = PchipInterpolator(angles, np.radians(directions))
    # Plain arrays are also safe for Manim's animation-cache serializer.
    return spline.x.copy(), spline.c.copy()


P_LABEL_ANGLE = angular_path(
    [0, 20, 30, 45, 90, 150, 270, 360],
    [45, 45, 75, 90, 135, 195, 315, 405],
)
Q_LABEL_ANGLE = angular_path(
    [0, 20, 45, 90, 150, 180, 200, 225, 270, 315, 340, 360],
    [-45, -45, -25, 0, -35, -45, 0, 0, 0, -30, -45, -45],
)


def label_offset(angle, path):
    breaks, coefficients = path
    degrees = np.clip(np.degrees(angle), 0, 360)
    interval = int(np.clip(np.searchsorted(breaks, degrees, side="right") - 1, 0, len(breaks) - 2))
    direction = float(np.polyval(coefficients[:, interval], degrees - breaks[interval]))
    return LABEL_DISTANCE * np.array([np.cos(direction), np.sin(direction), 0])


class TrigonometricFunctions(Scene):
    def construct(self):
        origin = LEFT * 2.65
        theta = ValueTracker(0.0)
        tangent_visible = ValueTracker(0.0)
        axes = Axes(
            x_range=[-1.35, 1.35, 1], y_range=[-1.35, 1.35, 1],
            x_length=2 * 1.35 * R, y_length=2 * 1.35 * R,
            axis_config={"color": MUTED, "include_ticks": False, "tip_width": 0.15, "tip_height": 0.15},
        ).move_to(origin)
        x_label = MathTex("x", font_size=36, color=MUTED).next_to(axes.x_axis.get_end(), RIGHT, buff=0.15)
        y_label = MathTex("y", font_size=36, color=MUTED).next_to(axes.y_axis.get_end(), UP, buff=0.15)
        circle = Circle(radius=R, color=PRIMARY, stroke_width=3).move_to(origin)
        self.play(Create(axes), Create(circle), FadeIn(x_label, y_label))

        def p_pos():
            t = theta.get_value()
            return origin + R * np.array([np.cos(t), np.sin(t), 0])

        def tangent_height():
            t = theta.get_value()
            # At an asymptote there is no finite Q. Keep construction endpoints finite.
            if abs(np.cos(t)) < 1e-8:
                return np.copysign(1e8, np.sin(t))
            return R * np.tan(t)

        def q_pos():
            return origin + np.array([R, np.clip(tangent_height(), -3.1, 3.1), 0])

        def q_opacity():
            height = tangent_height()
            # The whole label (below/right of Q) must fit before it becomes visible.
            edge_clearance = min(3.1 - height, height + 2.8)
            return tangent_visible.get_value() * np.clip(edge_clearance / 0.25, 0, 1)

        def backed_label(tex):
            label = MathTex(tex, font_size=36, color=ACCENT)
            label.add_background_rectangle(color=config.background_color, opacity=1, buff=0.045)
            return label.set_z_index(10)

        p_label = backed_label("P")

        def update_p_label(label):
            label.move_to(p_pos() + label_offset(theta.get_value(), P_LABEL_ANGLE))

        p_label.add_updater(update_p_label)
        update_p_label(p_label)
        q_label = backed_label("Q")
        q_label.add_updater(lambda m: m.move_to(q_pos() + label_offset(theta.get_value(), Q_LABEL_ANGLE)).set_opacity(q_opacity()))
        q_label.update()
        radius = always_redraw(lambda: Line(origin, p_pos(), color=ACCENT, stroke_width=4))
        point = always_redraw(lambda: Dot(p_pos(), color=ACCENT, radius=0.09).set_z_index(5))

        tangent_line = Line(origin + np.array([R, -3.1, 0]), origin + np.array([R, 3.1, 0]), color=MUTED, stroke_width=2)
        x_one_label = MathTex("x=1", font_size=36, color=MUTED).move_to(origin + np.array([R, -3.55, 0]))

        def extended_radius():
            height = tangent_height()
            fraction = min(1, 3.1 / max(abs(height), 1e-8))
            endpoint = origin + np.array([R * fraction, np.clip(height, -3.1, 3.1), 0])
            return Line(origin, endpoint, color=ACCENT, stroke_width=3).set_opacity(tangent_visible.get_value())

        q_line = always_redraw(extended_radius).set_z_index(-1)
        q_point = always_redraw(lambda: Dot(q_pos(), color=ACCENT, radius=0.09).set_opacity(q_opacity()).set_z_index(5))
        tan_seg = always_redraw(lambda: Line(origin + RIGHT * R, q_pos(), color=TAN_COLOR, stroke_width=8).set_opacity(tangent_visible.get_value()))
        foot_x = lambda: np.array([p_pos()[0], origin[1], 0])
        foot_y = lambda: np.array([origin[0], p_pos()[1], 0])
        drop_x = always_redraw(lambda: DashedLine(p_pos(), foot_x(), color=MUTED, stroke_width=2))
        drop_y = always_redraw(lambda: DashedLine(p_pos(), foot_y(), color=MUTED, stroke_width=2))
        cos_seg = always_redraw(lambda: Line(origin, foot_x(), color=COS_COLOR, stroke_width=8))
        sin_seg = always_redraw(lambda: Line(origin, foot_y(), color=SIN_COLOR, stroke_width=8))
        arc = always_redraw(lambda: Arc(radius=0.55, start_angle=0, angle=max(theta.get_value(), 1e-5), arc_center=origin, color=ACCENT, stroke_width=3))

        # Each coordinate is one function of the displayed angle, with its evaluated
        # value directly under a brace. Static TeX is created once, never per frame.
        def function_coordinate(function, color, value_function):
            operator = MathTex(function, font_size=36, color=color)
            angle = Integer(0, font_size=36, color=color)
            degree = MathTex(r"{}^\circ", font_size=36, color=color)
            expression = VGroup(operator, angle, degree)
            anchor = VectorizedPoint()

            def layout_expression(anchor, expression):
                operator, angle, degree = expression
                angle.set_value(round(np.degrees(theta.get_value())))
                operator.move_to(anchor.get_center(), aligned_edge=LEFT)
                angle.next_to(operator, RIGHT, buff=0.08)
                degree.next_to(angle, RIGHT, buff=0.015).shift(UP * 0.09)

            layout_expression(anchor, expression)
            # A transparent slot keeps the expression baseline separate from annotations.
            slot_width = expression.width
            slot = Rectangle(width=slot_width, height=0.52, stroke_opacity=0, fill_opacity=0)
            slot.move_to(operator.get_left(), aligned_edge=LEFT)
            brace = Brace(slot, DOWN, buff=0.1, color=color)
            number = DecimalNumber(value_function(0), num_decimal_places=2, font_size=36, color=color)
            number.next_to(brace, DOWN, buff=0.1)
            undefined = MathTex(r"\text{non definita}", font_size=36, color=color).next_to(brace, DOWN, buff=0.1)
            undefined.set_opacity(0)
            group = VGroup(slot, anchor, expression, brace, number, undefined)

            def update_coordinate(coordinate):
                slot, anchor, expression, brace, number, undefined = coordinate
                layout_expression(anchor, expression)
                slot.stretch_to_fit_width(expression.width).move_to(expression)
                brace.stretch_to_fit_width(expression.width).next_to(slot, DOWN, buff=0.1)
                t = theta.get_value()
                singular = function == r"\tan" and abs(np.cos(t)) < 1e-8
                # Hide numerical blow-up only near the singularity; a finite off-screen Q
                # still has a meaningful tangent value in the coordinate expression.
                opacity = np.clip((abs(np.cos(t)) - 0.015) / 0.06, 0, 1) if function == r"\tan" else 1
                value = 0 if singular else value_function(t)
                number.set_value(0 if abs(value) < 0.005 else value)
                number.next_to(brace, DOWN, buff=0.1).set_opacity(opacity)
                undefined.next_to(brace, DOWN, buff=0.1).set_opacity(1 if singular else 0)

            group.add_updater(update_coordinate)
            return group

        def coordinate_row(name, functions, height):
            parts = [MathTex(name + "(", font_size=36)]
            for index, function in enumerate(functions):
                if index:
                    parts.append(MathTex(",", font_size=36))
                parts.append(function)
            parts.append(MathTex(")", font_size=36))
            row = VGroup(*parts)
            def layout_row(row):
                cursor = 1.65
                for part in row:
                    part.update()
                    # Use the expression slot rather than the annotation bounding box.
                    body = part[0] if isinstance(part, VGroup) else part
                    baseline_offset = -0.12 if isinstance(part, MathTex) and part.tex_string == "," else 0
                    part.shift(np.array([cursor - body.get_left()[0], height + baseline_offset - body.get_center()[1], 0]))
                    cursor += body.width + 0.10

            row.add_updater(layout_row)
            layout_row(row)
            return row

        p_coords = coordinate_row("P", [function_coordinate(r"\cos", COS_COLOR, np.cos), function_coordinate(r"\sin", SIN_COLOR, np.sin)], 1.55)
        q_coords = coordinate_row("Q", [MathTex("1", font_size=36), function_coordinate(r"\tan", TAN_COLOR, np.tan)], -0.8)

        self.play(Create(radius), FadeIn(point, p_label))
        self.wait(0.5)
        self.play(FadeIn(drop_x, drop_y), Create(cos_seg), Create(sin_seg), FadeIn(arc))
        self.play(FadeIn(p_coords))
        self.wait(0.5)
        self.play(theta.animate.set_value(20 * DEGREES), run_time=2.5, rate_func=smooth)
        self.wait(0.8)
        self.play(Create(tangent_line), FadeIn(x_one_label))
        self.add(q_line, tan_seg, q_point, q_label)
        q_coords.update()
        self.play(tangent_visible.animate.set_value(1), FadeIn(q_coords))
        self.wait(0.8)
        for degrees, duration in [(45, 2), (150, 3), (270, 3), (360, 3)]:
            self.play(theta.animate.set_value(degrees * DEGREES), run_time=duration, rate_func=smooth)
            self.wait(0.8)
        self.wait(2)
