'use client'

import { useState, useEffect } from 'react'

interface MetricsSummary {
  totalGenerations: number
  successRate: number
  avgResponseTime: number
  ragUsageRate: number
  critiqueUsageRate: number
  duplicateDetectionRate: number
}

interface DailyStat {
  success: number
  fail: number
  totalMs: number
  count: number
}

interface MetricsData {
  dailyStats: Record<string, DailyStat>
  summary: MetricsSummary
}

export default function MetricsCards() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(14)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/metrics/dashboard?days=${period}`)
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.metrics)
        setError(null)
      } else {
        setError(data.message || 'メトリクス取得に失敗しました')
      }
    } catch (err) {
      console.error('Metrics fetch error:', err)
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [period])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <p className="text-red-700">⚠️ {error}</p>
        <button 
          onClick={fetchMetrics}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!metrics) return null

  const { summary, dailyStats } = metrics

  // 7日間の簡易チャートデータ
  const last7Days = Object.entries(dailyStats)
    .slice(-7)
    .map(([date, stats]) => ({
      date: new Date(date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      success: stats.success,
      fail: stats.fail
    }))

  return (
    <div className="mb-8">
      {/* 期間選択 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">生成メトリクス</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value={7}>過去7日</option>
          <option value={14}>過去14日</option>
          <option value={30}>過去30日</option>
        </select>
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 成功率 */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">成功率</p>
              <p className="text-2xl font-bold text-green-600">
                {(summary.successRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {summary.totalGenerations}件中 {Math.floor(summary.totalGenerations * summary.successRate)}件成功
              </p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 平均応答時間 */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均応答時間</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.avgResponseTime > 1000 
                  ? `${(summary.avgResponseTime / 1000).toFixed(1)}s`
                  : `${Math.round(summary.avgResponseTime)}ms`
                }
              </p>
              <p className="text-xs text-gray-500">
                {summary.avgResponseTime > 5000 ? '改善推奨' : '良好'}
              </p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* RAG採用率 */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">RAG採用率</p>
              <p className="text-2xl font-bold text-purple-600">
                {(summary.ragUsageRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                参考情報を活用した割合
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 推敲適用率 */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">推敲適用率</p>
              <p className="text-2xl font-bold text-orange-600">
                {(summary.critiqueUsageRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                二段生成による品質向上
              </p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 簡易チャート */}
      {last7Days.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">過去7日間の生成状況</h3>
          
          <div className="space-y-3">
            {last7Days.map((day) => {
              const total = day.success + day.fail
              const successRate = total > 0 ? (day.success / total) * 100 : 0
              
              return (
                <div key={day.date} className="flex items-center space-x-3">
                  <div className="w-16 text-sm text-gray-600">{day.date}</div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${successRate}%` }}
                    ></div>
                  </div>
                  <div className="w-20 text-sm text-gray-600 text-right">
                    {day.success}/{total}件
                  </div>
                </div>
              )
            })}
          </div>

          {summary.duplicateDetectionRate > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">重複検知率</span>
                <span className="font-semibold text-blue-600">
                  {summary.duplicateDetectionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}