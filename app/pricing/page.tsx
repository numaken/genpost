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
              AI駆動のWordPress記事自動生成で、あなたのコンテンツマーケティングを加速させましょう
            </p>
          </div>

          <div className="flex justify-center">
            <PricingTable />
          </div>

          {/* FAQ セクション */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              よくあるご質問
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. プランの変更はいつでもできますか？
                </h3>
                <p className="text-gray-600">
                  A. はい、いつでもプランの変更や解約が可能です。アップグレードは即座に反映され、ダウングレードは次の請求サイクルから適用されます。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. 独自APIキーを使用する場合の費用は？
                </h3>
                <p className="text-gray-600">
                  A. 独自のOpenAI APIキーを設定した場合、GenPostのプラン料金に加えて、OpenAI APIの使用料金が直接OpenAIから請求されます。GPT-3.5-turboの場合、1記事あたり約1-3円程度の費用が目安です。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. WordPress サイトは何個まで接続できますか？
                </h3>
                <p className="text-gray-600">
                  A. Starter=2サイト、Pro=5サイト、Agency=20サイトです（フリープランは2サイト）。必要に応じて上位プランや追加オプションをご検討ください。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. 生成された記事の品質はどうですか？
                </h3>
                <p className="text-gray-600">
                  A. 450種類以上の専用プロンプトを使用して、業界特化型の高品質な記事を生成します。重複チェック機能により、既存記事との重複も防げます。
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. サポートはありますか？
                </h3>
                <p className="text-gray-600">
                  A. 全プランで基本サポートを提供しており、有料プランではより手厚いサポートをご利用いただけます。お問い合わせはメールまたはチャットでお気軽にどうぞ。
                </p>
              </div>
            </div>
          </div>

          {/* CTA セクション */}
          {!session && (
            <div className="mt-16 text-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">
                  今すぐ無料で始めましょう
                </h2>
                <p className="text-lg mb-6 opacity-90">
                  クレジットカード不要。5記事まで無料で生成できます。
                </p>
                <button
                  onClick={() => signIn('google')}
                  className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  無料でGenPostを始める
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}