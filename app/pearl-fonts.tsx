// The pearl Rococo pages set titles in Noto Serif TC and English labels in Cormorant Garamond italic.
// Neither ships on iPhone, so the pages that use them load them here; React 19 hoists the
// stylesheet into <head>. Other pages are unaffected until they are restyled.
export const PEARL_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Noto+Serif+TC:wght@500;600;700;900&display=swap";

export default function PearlFonts() {
  return <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link rel="stylesheet" href={PEARL_FONTS_HREF} precedence="default" />
  </>;
}
