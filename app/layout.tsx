import './globals.css'
import type { Metadata } from 'next'
import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'genpost - AI-Powered WordPress Article Generator',
  description: 'Generate. Post. Done. Create high-quality WordPress articles in seconds with AI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          {children}
          
          {/* フッター */}
          <footer className="bg-gray-800 text-white py-8 mt-16">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                  <div className="text-xl font-bold mb-2">
                    gen<span className="text-purple-300">post</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    AI-powered WordPress article generator
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
                  <div className="flex space-x-6 text-sm">
                    <a 
                      href="https://www.panolabollc.com/term/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      利用規約
                    </a>
                    <a 
                      href="https://www.panolabollc.com/privacy/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      プライバシーポリシー
                    </a>
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    © 2024 Panolabo LLC. All rights reserved.
                  </div>
                </div>
              </div>
              
              {/* GenPost特別条項の補足 */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• AI生成コンテンツの品質保証はいたしません。最終確認・編集はユーザー様の責任となります。</p>
                  <p>• WordPress自動投稿機能により生じた問題について、弊社は責任を負いかねます。</p>
                  <p>• OpenAI APIキーは暗号化して保存されますが、管理はユーザー様の責任となります。</p>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}