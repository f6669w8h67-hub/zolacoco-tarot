// 七日陪跑筆記 (/journal): the seven-day journal for members Zola marked 陪跑中, whether or not they
// hold VIP months. The page is open to everyone (proxy.ts) and shows a short note to anyone else; the
// notes come only from /api/coaching/journal, which checks the person on the server. It wears the home
// page's 內在探索 panel so the journal looks the same in both places.
import { JournalTool } from "./journal-tool";
import "../styles/pearl-page.css";
import "../styles/home-pearl.css";

export default function JournalPage() {
  return <main className="home-pearl journal-page pearl-page">
    <section className="explore" id="explore">
      <span className="pearl-corners" aria-hidden="true" />
      <div className="explore-heading">
        <p className="eyebrow">SEVEN-DAY COACHING JOURNAL</p>
        <h2>七日陪跑筆記</h2>
        <p>每天回答一個內在提問，寫下第一個浮現的念頭就好。Zola 會逐天閱讀，並在這裡回覆妳。</p>
      </div>
      <div className="explore-layout ex-layout">
        <div className="tool-stage"><JournalTool place="page" /></div>
      </div>
    </section>
  </main>;
}
