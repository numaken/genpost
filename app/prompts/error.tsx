// app/prompts/error.tsx
'use client'

export default function Error({ 
  error,
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-800 mb-4">
            エラーが発生しました
          </h2>
          <p className="text-red-600 mb-6">
            プロンプトの読み込み中にエラーが発生しました。<br />
            時間をおいて再度お試しください。
          </p>
          {error.message && (
            <details className="text-left mb-6">
              <summary className="cursor-pointer text-sm text-red-500 hover:text-red-600">
                詳細情報
              </summary>
              <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-x-auto">
                {error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              もう一度試す
            </button>
            <a
              href="/"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ホームに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}