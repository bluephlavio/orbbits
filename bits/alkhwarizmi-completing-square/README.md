# Completing the square in al-Khwarizmi

The geometric proof behind the worked example *x² + 10x = 39* in al-Khwarizmi's *Al-jabr*
(c. 820): the square of side *x* and two rectangles 5 × *x* are completed by a 5 × 5 corner,
giving a square of side *x* + 5 and area 39 + 25 = 64, hence *x* = 3.

- Kind: figure · Engine: TikZ
- Source: `src/figure.tex`
- Outputs: `dist/figure.svg` (slides/web), `dist/figure.pdf` (print)

## Workflow

```bash
just build alkhwarizmi-completing-square
just check alkhwarizmi-completing-square
```

## Notes

Serves as the end-to-end validation of the TikZ builder (latexmk → PDF → SVG via pdf2svg).
The proportions use the actual solution (*x* = 3) so that the picture is "to scale".
