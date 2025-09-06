// components/VersionInfo.tsx - システムバージョン詳細情報コンポーネント
import { getVersionInfo, VERSION_HISTORY } from '@/lib/version'

interface VersionInfoProps {
  detailed?: boolean
}

export default function VersionInfo({ detailed = false }: VersionInfoProps) {
  const versionInfo = getVersionInfo()

  if (!detailed) {
    return (
      <div className="text-center text-sm text-gray-500">
        <div className="mb-2">
          {versionInfo.fullName} - WordPress記事自動生成システム
        </div>
        <div className="text-xs text-gray-400">
          Build: {versionInfo.buildInfo} | panolabo AI エンジン搭載
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        システム情報 - {versionInfo.fullName}
      </h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-700">バージョン:</span>
            <span className="ml-2 text-gray-600">{versionInfo.version}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">リリース日:</span>
            <span className="ml-2 text-gray-600">{versionInfo.date}</span>
          </div>
        </div>

        {/* 最新バージョンの機能一覧 */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">最新機能:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            {VERSION_HISTORY[versionInfo.version as keyof typeof VERSION_HISTORY]?.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>

        {/* バージョン履歴 */}
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
            バージョン履歴を表示
          </summary>
          <div className="mt-3 space-y-3">
            {Object.entries(VERSION_HISTORY)
              .reverse()
              .map(([version, info]) => (
                <div key={version} className="border-l-2 border-gray-200 pl-4">
                  <div className="font-medium text-gray-800">
                    v{version} ({info.date})
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    {info.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </details>
      </div>
    </div>
  )
}