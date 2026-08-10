import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="account-page">
      <section className="account-hero">
        <p className="eyebrow">ZOLACOCO ACCOUNT · VISITOR ACCESS</p>
        <span className="account-status"><i aria-hidden="true" />目前為訪客模式</span>
        <h1>先安心體驗，<br />再決定要不要成為會員</h1>
        <p>目前網站尚未開放正式帳號登入。你仍可使用塔羅、靈擺、星骰與星盤探索；儲存的內容只會留在現在這台裝置與瀏覽器中。</p>
        <div className="account-actions">
          <Link className="account-primary" href="/">回到首頁開始體驗</Link>
          <Link className="account-secondary" href="/admin">查看此裝置的存檔</Link>
        </div>
      </section>

      <section className="account-details" aria-label="訪客模式說明">
        <article><small>現在可以使用</small><h2>完整探索功能</h2><ul><li>塔羅抽牌、靈擺、星骰與療癒小房間</li><li>探索你的星盤與個人摘要</li><li>把紀錄儲存在目前裝置</li></ul></article>
        <article><small>訪客模式限制</small><h2>尚未跨裝置同步</h2><ul><li>手機與電腦的紀錄目前不會互通</li><li>清除瀏覽器資料後，紀錄可能消失</li><li>現在沒有需要輸入帳號或密碼的地方</li></ul></article>
        <article><small>正式會員規劃</small><h2>確認架構後再開放</h2><ul><li>正式登入與跨裝置紀錄</li><li>會員分級與不同使用權限</li><li>付費內容與會員資料管理</li></ul></article>
      </section>

      <aside className="account-note"><b>你的資料目前怎麼保存？</b><p>探索紀錄使用瀏覽器本機儲存，不會因為按下「登入／會員」就被上傳。正式會員系統會在分級、權限與付費方式確認後再建立，不先放入無法真正使用的登入表單。</p></aside>
    </main>
  );
}
