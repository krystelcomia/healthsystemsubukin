import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

/**
 * Makes arbitrary Tailwind text sizes (e.g. `text-[11px]`, `text-[0.7rem]`)
 * follow the Font Size setting by multiplying them with `--font-scale`.
 * Only font-size is touched, so layout dimensions stay fixed.
 */
const scaleArbitraryFontSizes = () => ({
  postcssPlugin: "scale-arbitrary-font-sizes",
  Rule(rule) {
    if (!rule.selector.includes("text-\\[")) return;
    rule.walkDecls("font-size", (decl) => {
      if (/^\d*\.?\d+(px|rem)$/.test(decl.value.trim())) {
        decl.value = `calc(${decl.value.trim()} * var(--font-scale, 1))`;
      }
    });
  },
});
scaleArbitraryFontSizes.postcss = true;

export default {
  plugins: [tailwindcss(), scaleArbitraryFontSizes(), autoprefixer()],
};
