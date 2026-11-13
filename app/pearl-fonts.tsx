// The whole site is set in Noto Serif TC (owner: 「字體都用宋體 全部網站文字都是」), with English labels
// in Cormorant Garamond italic. Neither ships on iPhone, so the root layout loads them for every page;
// React 19 hoists the stylesheet into <head>.
export const PEARL_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Noto+Serif+TC:wght@400;500;600;700;900&display=swap";

export default function PearlFonts() {
  return <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link rel="stylesheet" href={PEARL_FONTS_HREF} precedence="default" />
  </>;
}
