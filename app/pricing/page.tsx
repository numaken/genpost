'use client'

import { useSession, signIn } from 'next-auth/react'
import PricingTable from '@/components/PricingTable'
import Link from 'next/link'

export default function PricingPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GP</span>
            </div>
            <span className="text-xl font-bold text-gray-800">GenPost</span>
          </Link>

          <div className="flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {session.user?.name || session.user?.email}
                </span>
                <Link 
                  href="/"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ダッシュボード
                </Link>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ログイン
              </button>
            )}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              GenPost 料金プラン
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              "見出しの自然化＋人肌フィルタ＋推敲フロー"でAIっぽさを抑え、WordPressへ自動投稿。
            </p>
          </div>

          <div className="flex justify-center">
            <PricingTable />
          </div>

          {/* FAQ セクション */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h2 id="faq" className="text-2xl font-bold text-center text-gray-900 mb-8">
              よくあるご質問
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. 何が"AIっぽさ"を抑えるの？
                </h3>
                <p className="text-gray-600">
                  A. 見出しの自然化（What/How/Why→読者の言葉）＋人肌フィルタ（紋切り表現の軽除去）＋推敲フロー（Draft→Critique→Revise）を自動適用します。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. プランの変更はいつでもできますか？
                </h3>
                <p className="text-gray-600">
                  A. はい。いつでも変更・解約可能です。アップグレードは即時、ダウングレードは次回請求から反映されます。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. 独自APIキー（BYOK）の費用は？
                </h3>
                <p className="text-gray-600">
                  A. GenPostの月額とは別に、OpenAIのAPI料金がOpenAIから直接請求されます。当社側の月間上限対象外でご利用いただけます（公正利用のレート制限あり）。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. どのAIモデルが使えますか？
                </h3>
                <p className="text-gray-600">
                  A. 当社提供の標準モデルに加え、BYOK設定時は上位モデルも利用可能です（提供状況に準拠）。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. WordPressは何サイトまで接続できますか？
                </h3>
                <p className="text-gray-600">
                  A. スターター=2サイト、プロ=5サイト、エージェンシー=20サイトが目安です。追加サイトのアドオンも利用できます。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. 重複検知の仕組みは？
                </h3>
                <p className="text-gray-600">
                  A. SimHashで既存記事との類似度を確認し、重複コンテンツを防ぎます。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. 無料で試せますか？
                </h3>
                <p className="text-gray-600">
                  A. はい。クレカ不要で5記事までお試しできます。
                </p>
              </div>
            </div>
          </div>

          {/* CTA セクション */}
          {!session && (
            <div className="mt-16 text-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">
                  無料で始める
                </h2>
                <p className="text-lg mb-6 opacity-90">
                  クレジットカード不要。見出し自然化＋人肌フィルタを基本機能でお試しできます。
                </p>
                <button
                  onClick={() => signIn('google')}
                  className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                  id="footer-cta"
                >
                  無料で始める
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 構造化データ (JSON-LD) */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "何が\"AIっぽさ\"を抑えるの？",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "見出しの自然化（What/How/Why→読者の言葉）＋人肌フィルタ（紋切り表現の軽除去）＋推敲フロー（Draft→Critique→Revise）を自動適用します。"
                }
              },
              {
                "@type": "Question", 
                "name": "独自APIキー（BYOK）の費用は？",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "GenPostの月額とは別に、OpenAIのAPI料金がOpenAIから直接請求されます。当社側の月間上限対象外でご利用いただけます（公正利用のレート制限あり）。"
                }
              },
              {
                "@type": "Question",
                "name": "プランの変更はいつでもできますか？",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "はい。いつでも変更・解約可能です。アップグレードは即時、ダウングレードは次回請求から反映されます。"
                }
              }
            ]
          })
        }}
      />
    </div>
  )
}